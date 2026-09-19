import { LoginPage } from '../../features/auth/LoginPage';
import { GuestGuard } from '../../features/auth/RouteGuards';

export default function Page() {
  return (
    <GuestGuard>
      <LoginPage />
    </GuestGuard>
  );
}
