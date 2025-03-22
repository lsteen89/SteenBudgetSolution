import React from 'react';

import { ReactNode } from 'react';

const CenteredContainer = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex items-center justify-center h-screen">
      {children}
    </div>
  );
};

export default CenteredContainer;