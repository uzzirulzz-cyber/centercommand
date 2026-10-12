import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './globals.css';

import { ThemeProvider } from '../components/ThemeProvider';
import { NO_FLASH_SCRIPT } from '../lib/theme/css';

export const metadata = {
  title: 'PlayBeat Digital — Central Admin',
  description: 'Unified administration for the PlayBeat Digital ecosystem.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-bs-theme="light" suppressHydrationWarning>
      <head>
        {/* Paints the published theme before hydration so there is no flash of
            the wrong palette. Reads a cosmetic cache only — never credentials. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
