import { Redirect } from '../features/auth/RouteGuards';

export default function NotFound() {
  return <Redirect to="/" />;
}
