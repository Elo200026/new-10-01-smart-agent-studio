import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, Upload, FileJson, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkflowImportExportProps {
  configName: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onImport: (data: WorkflowImportData) => void;
}

interface WorkflowNode {
  type?: string;
  data?: Record<string, unknown>;
}

type WorkflowEdge = Record<string, unknown>;

interface WorkflowImportData {
  version?: string;
  name?: string;
  exportedAt?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  agents?: Record<string, unknown>[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const WorkflowImportExport: React.FC<WorkflowImportExportProps> = ({
  configName,
  nodes,
  edges,
  onImport,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const [importPreview, setImportPreview] = React.useState<WorkflowImportData | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async () => {
    const agentNodes = nodes.filter((n) => n.type === 'agent');
    if (agentNodes.length === 0) {
      toast({
        title: 'No Agents',
        description: 'Add at least one agent to export',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      // Dynamic import to avoid crash if user hasn't installed them yet
      const JSZip = (await import('jszip')).default;
      const { saveAs } = await import('file-saver');

      const exportData = {
        version: '1.0',
        name: configName,
        exportedAt: new Date().toISOString(),
        nodes,
        edges,
        agents: agentNodes.map((n) => n.data),
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      const packageJson = {
        name: configName.toLowerCase().replace(/\s+/g, '-'),
        version: "1.0.0",
        description: "Standalone AI Agent Workflow App",
        main: "index.js",
        type: "module",
        scripts: {
          start: "node index.js"
        },
        dependencies: {
          "dotenv": "^16.4.5"
        }
      };

      const readmeMd = [
        "# " + configName + " - AI Agent Workflow",
        "",
        "## Setup & Run",
        "1. Install dependencies:",
        "   `npm install`",
        "2. (Optional) Create a `.env` file if needed for your custom logic.",
        "3. Start the workflow engine:",
        "   `npm start`",
        ""
      ].join('\n');

      const indexJsTemplate = [
        "import fs from 'fs';",
        "import path from 'path';",
        "import { fileURLToPath } from 'url';",
        "",
        "const __filename = fileURLToPath(import.meta.url);",
        "const __dirname = path.dirname(__filename);",
        "",
        "console.log('🚀 Starting AI Workflow Engine...');",
        "",
        "try {",
        "  const configRaw = fs.readFileSync(path.join(__dirname, 'workflow.json'), 'utf8');",
        "  const workflowConfig = JSON.parse(configRaw);",
        "  ",
        "  console.log('✅ Loaded Workflow: ' + workflowConfig.name);",
        "  console.log('📦 Number of Agents: ' + workflowConfig.agents.length);",
        "  console.log('--------------------------------------------------');",
        "",
        "  workflowConfig.agents.forEach((agent, index) => {",
        "    console.log('🤖 Initializing Agent [' + (agent.name || 'Agent ' + (index+1)) + ']: ' + (agent.role || 'Unspecified Role'));",
        "  });",
        "",
        "  console.log('--------------------------------------------------');",
        "  console.log('🔔 Workflow is ready. Add your LLM execution logic here.');",
        "  ",
        "} catch (error) {",
        "  console.error('❌ Error running workflow:', error.message);",
        "}"
      ].join('\n');

      const zip = new JSZip();
      const appRoot = zip.folder(configName.replace(/\s+/g, '_') || "ai-workflow-app");
      
      if (appRoot) {
        appRoot.file("workflow.json", jsonString);
        appRoot.file("package.json", JSON.stringify(packageJson, null, 2));
        appRoot.file("README.md", readmeMd);
        appRoot.file("index.js", indexJsTemplate);
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, configName.replace(/\s+/g, '_') + '_App.zip');

      toast({
        title: 'App Exported Successfully',
        description: 'Your workflow app has been saved as a ZIP file.',
      });
    } catch (err) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export app. Please ensure jszip and file-saver are installed.',
        variant: 'destructive',
      });
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as unknown;

        // Validate the structure
        if (!isRecord(data) || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
          setImportError('Invalid workflow file: missing nodes or edges');
          setImportPreview(null);
          setImportDialogOpen(true);
          return;
        }

        setImportPreview(data as WorkflowImportData);
        setImportError(null);
        setImportDialogOpen(true);
      } catch (error) {
        setImportError('Failed to parse JSON file');
        setImportPreview(null);
        setImportDialogOpen(true);
      }
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
  };

  const confirmImport = () => {
    if (importPreview) {
      onImport(importPreview);
      setImportDialogOpen(false);
      setImportPreview(null);
      toast({
        title: 'Workflow Imported',
        description: `Successfully imported "${importPreview.name || 'workflow'}"`,
      });
    }
  };

  const previewNodes = importPreview?.nodes ?? [];
  const agentCount = importPreview?.agents?.length ?? previewNodes.filter((n) => n.type === 'agent').length;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        className="gap-1.5"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Export</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        className="gap-1.5"
      >
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">Import</span>
      </Button>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-primary" />
              Import Workflow
            </DialogTitle>
            <DialogDescription>
              Review the workflow configuration before importing.
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {importError ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-lg bg-destructive/10 border border-destructive/20"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Import Error</p>
                    <p className="text-sm text-destructive/80 mt-1">
                      {importError}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : importPreview ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <div>
                        <p className="font-medium">{importPreview.name || 'Untitled Workflow'}</p>
                        <p className="text-xs text-muted-foreground">
                          {importPreview.exportedAt
                            ? `Exported: ${new Date(importPreview.exportedAt).toLocaleDateString()}`
                            : 'Export date unknown'}
                        </p>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{agentCount} agent{agentCount !== 1 ? 's' : ''}</span>
                        <span>{importPreview.edges?.length || 0} connection{(importPreview.edges?.length || 0) !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setImportDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={confirmImport}>Import Workflow</Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
};
