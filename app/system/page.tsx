import { redirect } from 'next/navigation';

export default function LegacySystemPage() {
  redirect('/equipment/diagnostics.html');
}
