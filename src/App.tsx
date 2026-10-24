import React from 'react';
import { useApp } from './context/AppContext';
import { LoadingScreen } from './components/LoadingScreen';
import { StarryBackground } from './components/StarryBackground';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Chatbot } from './components/Chatbot';
import { HomeView } from './views/HomeView';
import { LearnView } from './views/LearnView';
import { ProgressView } from './views/ProgressView';
import { AccountView } from './views/AccountView';
import { JourneyView } from './views/JourneyView';

export const AppContent: React.FC = () => {
  const { view } = useApp();

  return (
    <>
      <LoadingScreen />
      <div className="universe">
        <StarryBackground />
        <Navbar />

        <main>
          {view === 'home' && <HomeView />}
          {view === 'learn' && <LearnView />}
          {view === 'progress' && <ProgressView />}
          {view === 'account' && <AccountView />}
          {view === 'journey' && <JourneyView />}
        </main>

        <Footer />
      </div>

      <Chatbot />
    </>
  );
};
