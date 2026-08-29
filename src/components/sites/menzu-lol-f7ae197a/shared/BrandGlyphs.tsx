/**
 * The social marks the shop links out with.
 *
 * Lucide dropped brand icons, and the live site serves its own from icons8
 * behind signed query strings that cannot be re-hosted, so these are inline
 * paths standing in for them. They live here rather than beside one caller
 * because two places draw them now — the footer's row of tiles and the
 * "KẾT NỐI" rail — and a mark that differs between the two reads as two
 * different Facebooks.
 *
 * Sized by the caller through className, filled with currentColor so each one
 * inherits whatever the tile around it is doing on hover.
 */

const SIZE = "w-[17px] h-[17px]";

export function FacebookGlyph({ className = SIZE }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

export function ZaloGlyph({ className = SIZE }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.5 2 2 5.9 2 10.7c0 2.7 1.4 5.1 3.6 6.7-.1.9-.5 2.2-1.3 3.2-.2.3.1.7.4.6 1.9-.5 3.3-1.3 4.1-1.9.9.2 1.9.3 2.9.3 5.5 0 10-3.9 10-8.7S17.5 2 12 2Zm-4.6 6.1h3.4v.9L8.5 12.5h2.4v1H7.2v-.9l2.3-3.6H7.4v-.9Zm4.6 0h1v5.4h-1V8.1Zm3.6 1.4c1.2 0 2.1.9 2.1 2s-.9 2-2.1 2-2.1-.9-2.1-2 .9-2 2.1-2Zm0 .9c-.6 0-1.1.5-1.1 1.1s.5 1.1 1.1 1.1 1.1-.5 1.1-1.1-.5-1.1-1.1-1.1Z" />
    </svg>
  );
}

export function TiktokGlyph({ className = SIZE }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1 0-5.18c.27 0 .52.04.76.12v-3.2a5.79 5.79 0 0 0-.76-.05 5.78 5.78 0 1 0 5.78 5.78V9.01a7.35 7.35 0 0 0 4.29 1.38V7.3a4.29 4.29 0 0 1-3.33-1.48Z" />
    </svg>
  );
}

export function DiscordGlyph({ className = SIZE }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.32 4.57A19.79 19.79 0 0 0 15.43 3c-.21.38-.46.9-.63 1.31a18.27 18.27 0 0 0-5.6 0C9.03 3.9 8.77 3.38 8.56 3a19.74 19.74 0 0 0-4.89 1.57C.56 9.09-.28 13.5.14 17.84a19.9 19.9 0 0 0 6.07 3.08c.49-.67.93-1.39 1.3-2.14-.71-.27-1.4-.6-2.04-.99.17-.13.34-.26.5-.4a14.2 14.2 0 0 0 12.06 0c.16.14.33.27.5.4-.65.39-1.33.72-2.05.99.38.75.81 1.47 1.3 2.14a19.87 19.87 0 0 0 6.08-3.08c.5-5.03-.84-9.4-3.54-13.27ZM8.02 15.2c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.4 2.15-2.4 1.21 0 2.18 1.09 2.16 2.4 0 1.32-.95 2.4-2.16 2.4Zm7.96 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.4 2.15-2.4 1.21 0 2.18 1.09 2.16 2.4 0 1.32-.95 2.4-2.16 2.4Z" />
    </svg>
  );
}

export function TelegramGlyph({ className = SIZE }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M21.94 4.6 18.9 19.3c-.23 1.02-.84 1.27-1.7.79l-4.7-3.46-2.27 2.18c-.25.25-.46.46-.95.46l.34-4.79 8.72-7.88c.38-.34-.08-.53-.59-.19L6.98 13.1l-4.64-1.45c-1.01-.32-1.03-1.01.21-1.5L20.63 3.1c.84-.31 1.57.2 1.31 1.5Z" />
    </svg>
  );
}

