import { PipelineProvider } from '@/context/PipelineContext';
import { WizardShell } from '@/components/WizardShell';

export default function Home() {
  return (
    <PipelineProvider>
      <WizardShell />
    </PipelineProvider>
  );
}
