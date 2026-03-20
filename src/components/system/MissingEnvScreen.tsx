import React from "react";

interface MissingEnvScreenProps {
  missing: string[];
}

export const MissingEnvScreen: React.FC<MissingEnvScreenProps> = ({ missing }) => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
    <div className="max-w-2xl rounded-lg border border-border/50 bg-card p-6 shadow-lg">
      <h1 className="text-2xl font-semibold mb-2">Missing environment configuration</h1>
      <p className="text-sm text-muted-foreground mb-4">
        This app requires Lovable runtime environment variables. Add the missing keys and refresh.
      </p>
      <ul className="list-disc list-inside text-sm space-y-1">
        {missing.map((key) => (
          <li key={key} className="font-mono text-primary">
            {key}
          </li>
        ))}
      </ul>
      <div className="mt-4 text-sm text-muted-foreground space-y-2">
        <p>
          In Lovable, open your project settings and add the values under Environment Variables.
        </p>
        <p>
          For local development, copy <span className="font-mono">.env.example</span> to{" "}
          <span className="font-mono">.env</span> and fill in your Supabase URL and publishable
          key.
        </p>
      </div>
    </div>
  </div>
);
