import AppShell from "../../components/app-shell";
import { readSettings } from "../../lib/settings";
import SettingsForm from "./settings-form";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const settings = readSettings();
  return (
    <AppShell title="Settings">
      <SettingsForm defaults={settings} />
    </AppShell>
  );
}
