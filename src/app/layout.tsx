export const metadata = { title: "Said-No", description: "Your wallet remembers every time you said no." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
