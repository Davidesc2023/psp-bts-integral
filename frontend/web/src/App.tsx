import { AppRoutes } from './routes/AppRoutes';
import { OnboardingTour } from '@modules/shared/components/OnboardingTour';

function App() {
  return (
    <>
      <AppRoutes />
      <OnboardingTour />
    </>
  );
}

export default App;
