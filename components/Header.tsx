/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { ShirtIcon } from './icons';

const Header: React.FC = () => {
  return (
    <header className="w-full py-6 px-6 md:px-12 fixed top-0 left-0 right-0 z-40 bg-transparent pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">
          <div className="bg-white/80 backdrop-blur-md p-2 rounded-full shadow-sm border border-white/50">
            <ShirtIcon className="w-5 h-5 text-gray-900" />
          </div>
          <h1 className="text-xl font-serif tracking-widest text-gray-900 font-medium bg-white/50 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
            Try on the Go
          </h1>
      </div>
    </header>
  );
};

export default Header;