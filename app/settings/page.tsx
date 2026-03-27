import AppShell from "../../components/app-shell";
import { readSettings } from "../../lib/settings";
import SettingsForm from "./settings-form";
import LicensePanel from "./settings-license";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const settings = readSettings();
  return (
    <AppShell title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SettingsForm defaults={settings} />
        <LicensePanel />
      </div>
    </AppShell>
  );
}
