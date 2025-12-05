import React from 'react';
import RayTracingSimulation from './components/RayTracingSimulation';

const App: React.FC = () => {
  return (
    <div className="w-full h-full relative">
      <RayTracingSimulation />
    </div>
  );
};

export default App;