import {
  Settings,
  Mail,
  Upload,
  Shield,
  Ticket,
  Palette,
  Plug,
  Briefcase,
  Megaphone,
  KeyRound,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense } from "react";
import { getSettings } from "@/actions/settings";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllServices } from "@/actions/services";
import { EmailSettingsForm } from "@/components/settings/email-settings-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketSettingsForm } from "@/components/settings/ticket-settings-form";
import { AccessSettingsForm } from "@/components/settings/access-settings-form";
import { GeneralSettingsForm } from "@/components/settings/general-settings-form";
import { UpdatesSettingsForm } from "@/components/settings/updates-settings-form";
import { SecuritySettingsForm } from "@/components/settings/security-settings-form";
import { ServicesSettingsForm } from "@/components/settings/services-settings-form";
import { AppearanceSettingsForm } from "@/components/settings/appearance-settings-form";
import { FileUploadSettingsForm } from "@/components/settings/file-upload-settings-form";
import { IntegrationSettingsForm } from "@/components/settings/integration-settings-form";

// Force dynamic rendering for authenticated routes
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settingsResult = await getSettings();
  const servicesResult = await getAllServices();

  if (!settingsResult.success || !settingsResult.data) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Settings</CardTitle>
            <CardDescription>
              {settingsResult.error || "Failed to load settings"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const settings = settingsResult.data;
  const services =
    servicesResult.success && servicesResult.data ? servicesResult.data : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your support system configuration and preferences
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="inline-flex h-auto w-full flex-wrap justify-start gap-1 rounded-md bg-white p-1.5 lg:w-auto">
          <TabsTrigger
            value="general"
            className="gap-2 rounded-md px-4 py-2.5 text-sm font-medium data-[state=active]:bg-[color-mix(in_oklab,var(--primary)_10%,white)]! data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-primary/20! dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent"
          >
            <Settings className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger
            value="tickets"
            className="gap-2 rounded-md px-4 py-2.5 text-sm font-medium data-[state=active]:bg-[color-mix(in_oklab,var(--primary)_10%,white)]! data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-primary/20! dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent"
          >
            <Ticket className="h-4 w-4 text-orange-500" />
            <span className="hidden sm:inline">Tickets</span>
          </TabsTrigger>
          <TabsTrigger
            value="email"
            className="gap-2 rounded-md px-4 py-2.5 text-sm font-medium data-[state=active]:bg-[color-mix(in_oklab,var(--primary)_10%,white)]! data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-primary/20! dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent"
          >
            <Mail className="h-4 w-4 text-blue-500" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger
            value="files"
            className="gap-2 rounded-md px-4 py-2.5 text-sm font-medium data-[state=active]:bg-[color-mix(in_oklab,var(--primary)_10%,white)]! data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-primary/20! dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent"
          >
            <Upload className="h-4 w-4 text-purple-500" />
            <span className="hidden sm:inline">Files</span>
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="gap-2 rounded-md px-4 py-2.5 text-sm font-medium data-[state=active]:bg-[color-mix(in_oklab,var(--primary)_10%,white)]! data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-primary/20! dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent"
          >
            <Shield className="h-4 w-4 text-green-500" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="gap-2 rounded-md px-4 py-2.5 text-sm font-medium data-[state=active]:bg-[color-mix(in_oklab,var(--primary)_10%,white)]! data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-primary/20! dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent"
          >
            <Palette className="h-4 w-4 text-pink-500" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger
            value="integrations"
            className="gap-2 rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-[color-mix(in_oklab,var(--primary)_10%,white)]! data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-primary/20! dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent"
          >
            <Plug className="h-4 w-4 text-cyan-500" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger
            value="services"
            className="gap-2 rounded-md px-4 py-2.5 text-sm font-medium data-[state=active]:bg-[color-mix(in_oklab,var(--primary)_10%,white)]! data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-primary/20! dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent"
          >
            <Briefcase className="h-4 w-4 text-emerald-500" />
            <span className="hidden sm:inline">Services</span>
          </TabsTrigger>
          <TabsTrigger
            value="updates"
            className="gap-2 rounded-md px-4 py-2.5 text-sm font-medium data-[state=active]:bg-[color-mix(in_oklab,var(--primary)_10%,white)]! data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-primary/20! dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent"
          >
            <Megaphone className="h-4 w-4 text-indigo-500" />
            <span className="hidden sm:inline">Updates</span>
          </TabsTrigger>
          <TabsTrigger
            value="access"
            className="gap-2 rounded-md px-4 py-2.5 text-sm font-medium data-[state=active]:bg-[color-mix(in_oklab,var(--primary)_10%,white)]! data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-primary/20! dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent"
          >
            <KeyRound className="h-4 w-4 text-violet-500" />
            <span className="hidden sm:inline">Access</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Suspense fallback={<SettingsSkeleton />}>
            <GeneralSettingsForm settings={settings} />
          </Suspense>
        </TabsContent>

        {/* Ticket Settings */}
        <TabsContent value="tickets">
          <Suspense fallback={<SettingsSkeleton />}>
            <TicketSettingsForm settings={settings} />
          </Suspense>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <Suspense fallback={<SettingsSkeleton />}>
            <EmailSettingsForm settings={settings} />
          </Suspense>
        </TabsContent>

        {/* File Upload Settings */}
        <TabsContent value="files">
          <Suspense fallback={<SettingsSkeleton />}>
            <FileUploadSettingsForm settings={settings} />
          </Suspense>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Suspense fallback={<SettingsSkeleton />}>
            <SecuritySettingsForm settings={settings} />
          </Suspense>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <Suspense fallback={<SettingsSkeleton />}>
            <AppearanceSettingsForm settings={settings} />
          </Suspense>
        </TabsContent>

        {/* Integration Settings */}
        <TabsContent value="integrations">
          <Suspense fallback={<SettingsSkeleton />}>
            <IntegrationSettingsForm settings={settings} />
          </Suspense>
        </TabsContent>

        <TabsContent value="services">
          <Suspense fallback={<SettingsSkeleton />}>
            <ServicesSettingsForm services={services} />
          </Suspense>
        </TabsContent>

        <TabsContent value="updates">
          <Suspense fallback={<SettingsSkeleton />}>
            <UpdatesSettingsForm settings={settings} />
          </Suspense>
        </TabsContent>

        <TabsContent value="access">
          <Suspense fallback={<SettingsSkeleton />}>
            <AccessSettingsForm />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-96 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}
