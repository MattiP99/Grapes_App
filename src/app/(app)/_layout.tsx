import { AppShell } from '@/components/layout/AppShell';
import { ProfileLanguageSync } from '@/features/settings/ProfileLanguageSync';

export default function AppLayout() {
  return (
    <>
      <ProfileLanguageSync />
      <AppShell />
    </>
  );
}
