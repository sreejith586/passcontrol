import { AppRouter } from './router';
import { ToastContainer } from '@/shared/feedback/Toast';

export function App() {
  return (
    <>
      <AppRouter />
      <ToastContainer />
    </>
  );
}
