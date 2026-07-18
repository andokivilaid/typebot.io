/** @jsxImportSource react */

export const GeminiLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <title>Google Gemini Logo</title>
    <path
      fill="url(#geminiGradient)"
      d="M12 2.5c.4 3.8 2.7 6.1 6.5 6.5-3.8.4-6.1 2.7-6.5 6.5-.4-3.8-2.7-6.1-6.5-6.5 3.8-.4 6.1-2.7 6.5-6.5Z"
    />
    <path
      fill="url(#geminiGradient)"
      d="M18.5 14.5c.2 1.9 1.3 3 3.2 3.2-1.9.2-3 1.3-3.2 3.2-.2-1.9-1.3-3-3.2-3.2 1.9-.2 3-1.3 3.2-3.2Z"
    />
    <defs>
      <linearGradient
        id="geminiGradient"
        x1="5.5"
        y1="2.5"
        x2="21.7"
        y2="20.7"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#4285F4" />
        <stop offset="0.35" stopColor="#9B72CB" />
        <stop offset="0.7" stopColor="#D96570" />
        <stop offset="1" stopColor="#D96570" />
      </linearGradient>
    </defs>
  </svg>
);
