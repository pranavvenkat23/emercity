import { Home } from '@/screens/home';
import { SimpleHome } from '@/screens/home/simple-home';
import { useA11y } from '@/stores/a11y-store';

/** HOME-01, or the three-button Simple Mode home (§20.3). */
export default function HomeRoute() {
  const simple = useA11y((s) => s.simpleMode);
  return simple ? <SimpleHome /> : <Home />;
}
