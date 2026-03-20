import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Key, Globe, Palette, Moon, Sun, Bell, Database } from 'lucide-react';
import { ApiKeyManager } from '@/components/settings/ApiKeyManager';

export const Settings: React.FC = () => {
  const { t, theme, toggleTheme, lang, setLang } = useApp();
  
  // Notification preferences state with persistence
  const [emailNotifications, setEmailNotifications] = useState(() => {
    const stored = localStorage.getItem('rag_email_notifications');
    return stored !== null ? stored === 'true' : true;
  });
  
  const [browserNotifications, setBrowserNotifications] = useState(() => {
    const stored = localStorage.getItem('rag_browser_notifications');
    return stored !== null ? stored === 'true' : false;
  });

  // RAG settings state
  const [citationDisplay, setCitationDisplay] = useState(() => {
    const stored = localStorage.getItem('rag_citation_display');
    return stored !== null ? stored === 'true' : true;
  });

  const [hallucinationCheck, setHallucinationCheck] = useState(() => {
    const stored = localStorage.getItem('rag_hallucination_check');
    return stored !== null ? stored === 'true' : true;
  });

  // General settings state
  const [autoSave, setAutoSave] = useState(() => {
    const stored = localStorage.getItem('rag_auto_save');
    return stored !== null ? stored === 'true' : true;
  });

  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => {
    const stored = localStorage.getItem('rag_analytics');
    return stored !== null ? stored === 'true' : true;
  });

  // Persist notification settings
  useEffect(() => {
    localStorage.setItem('rag_email_notifications', String(emailNotifications));
  }, [emailNotifications]);

  useEffect(() => {
    localStorage.setItem('rag_browser_notifications', String(browserNotifications));
  }, [browserNotifications]);

  useEffect(() => {
    localStorage.setItem('rag_citation_display', String(citationDisplay));
  }, [citationDisplay]);

  useEffect(() => {
    localStorage.setItem('rag_hallucination_check', String(hallucinationCheck));
  }, [hallucinationCheck]);

  useEffect(() => {
    localStorage.setItem('rag_auto_save', String(autoSave));
  }, [autoSave]);

  useEffect(() => {
    localStorage.setItem('rag_analytics', String(analyticsEnabled));
  }, [analyticsEnabled]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t.settings?.title || t.sidebar.settings}</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t.settings?.systemSettings || 'System settings and preferences'}</p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
        {/* Appearance Card */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Palette className="h-5 w-5 text-primary" />
              {t.settings?.appearance || 'Appearance'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t.settings?.customizeLook || 'Customize the look and feel'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t.settings?.theme || 'Theme'}</Label>
                <p className="text-xs text-muted-foreground">{t.settings?.switchTheme || 'Switch between light and dark mode'}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={toggleTheme}
                className="gap-2 shrink-0"
              >
                {theme === 'dark' ? (
                  <>
                    <Moon className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.settings?.dark || 'Dark'}</span>
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.settings?.light || 'Light'}</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Language Card */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Globe className="h-5 w-5 text-primary" />
              {t.settings?.language || 'Language'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t.settings?.chooseLanguage || 'Choose interface language'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t.settings?.displayLanguage || 'Display Language'}</Label>
                <p className="text-xs text-muted-foreground">{t.settings?.selectLanguage || 'Select your preferred language'}</p>
              </div>
              <Select value={lang} onValueChange={(value: 'en' | 'ar') => setLang(value)}>
                <SelectTrigger className="w-[120px] sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* API Keys Card - Full width for better UX */}
        <Card className="sm:col-span-2">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Key className="h-5 w-5 text-primary" />
              {t.settings?.apiKeys || 'API Keys'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t.settings?.apiKeysDescription || 'Manage external API keys for AI providers. These keys are used by your agents and workflows.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApiKeyManager />
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Bell className="h-5 w-5 text-primary" />
              {t.settings?.notifications || 'Notifications'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t.settings?.notificationPreferences || 'Manage notification preferences'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t.settings?.emailNotifications || 'Email Notifications'}</Label>
                <p className="text-xs text-muted-foreground">{t.settings?.receiveWorkflowUpdates || 'Receive workflow updates'}</p>
              </div>
              <Switch 
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t.settings?.browserNotifications || 'Browser Notifications'}</Label>
                <p className="text-xs text-muted-foreground">{t.settings?.showDesktopAlerts || 'Show desktop alerts'}</p>
              </div>
              <Switch 
                checked={browserNotifications}
                onCheckedChange={setBrowserNotifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* RAG Settings Card */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Database className="h-5 w-5 text-primary" />
              {t.settings?.ragSettings || 'RAG Settings'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t.settings?.configureRetrieval || 'Configure retrieval parameters'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t.settings?.citationDisplay || 'Citation Display'}</Label>
                <p className="text-xs text-muted-foreground">{t.settings?.showSourcesInResponses || 'Show sources in responses'}</p>
              </div>
              <Switch 
                checked={citationDisplay}
                onCheckedChange={setCitationDisplay}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t.settings?.hallucinationCheck || 'Hallucination Check'}</Label>
                <p className="text-xs text-muted-foreground">{t.settings?.verifyAIResponses || 'Verify AI responses'}</p>
              </div>
              <Switch 
                checked={hallucinationCheck}
                onCheckedChange={setHallucinationCheck}
              />
            </div>
          </CardContent>
        </Card>

        {/* General Card */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <SettingsIcon className="h-5 w-5 text-primary" />
              {t.settings?.general || 'General'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t.settings?.generalSettings || 'General system settings'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t.settings?.autoSave || 'Auto-save'}</Label>
                <p className="text-xs text-muted-foreground">{t.settings?.saveChangesAutomatically || 'Save changes automatically'}</p>
              </div>
              <Switch 
                checked={autoSave}
                onCheckedChange={setAutoSave}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t.settings?.analyticsLabel || 'Analytics'}</Label>
                <p className="text-xs text-muted-foreground">{t.settings?.helpImprove || 'Help improve the platform'}</p>
              </div>
              <Switch 
                checked={analyticsEnabled}
                onCheckedChange={setAnalyticsEnabled}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
