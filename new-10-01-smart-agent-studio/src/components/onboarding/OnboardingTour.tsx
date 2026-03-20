import React, { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { useApp } from '@/contexts/AppContext';

export const OnboardingTour: React.FC = () => {
  const { theme } = useApp();
  const [run, setRun] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour');
    if (!hasSeenTour) {
      setRun(true);
    }
  }, []);

  const steps: Step[] = [
    {
      target: 'body',
      content: 'Welcome to Smart Agent Studio! Let us show you around.',
      placement: 'center',
    },
    {
      target: '#nav-dashboard',
      content: 'This is your Dashboard where you can see an overview of your agents and workflows.',
    },
    {
      target: '#nav-knowledge',
      content: 'Manage your documents and data in the Knowledge Base to power your agents with RAG.',
    },
    {
      target: '#nav-agents',
      content: 'Create and configure individual AI agents with specific personas and roles.',
    },
    {
      target: '#nav-workflows',
      content: 'Use the Multi-Agent Canvas to build complex, collaborative AI workflows.',
    },
    {
      target: '#nav-chat',
      content: 'Interact directly with your agents in the AI Assistant chat.',
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      setRun(false);
      localStorage.setItem('hasSeenOnboardingTour', 'true');
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--card))',
          textColor: 'hsl(var(--foreground))',
          arrowColor: 'hsl(var(--card))',
        },
      }}
    />
  );
};
