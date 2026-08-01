import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Icon({ title, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" aria-hidden={title ? undefined : true} role={title ? "img" : undefined} {...props}>
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function RoomIcon(props: IconProps) {
  return <Icon {...props}><path d="M4 20V7l8-4 8 4v13" /><path d="M8 20v-6h8v6M7 9h2m6 0h2" /></Icon>;
}

export function FireIcon(props: IconProps) {
  return <Icon {...props}><path d="M13 3c1 4-2 5-2 8 0 1 .5 2 1.5 2.5C12 10 15 9 16 6c3 3 4 6 4 9a8 8 0 0 1-16 0c0-3 2-6 5-8 0 3 1 4 2 5" /><path d="M9 18c0-2 1-3 3-5 2 2 3 3 3 5" /></Icon>;
}

export function RestIcon(props: IconProps) {
  return <Icon {...props}><path d="M6 3h12M6 21h12M8 3v4l4 5-4 5v4M16 3v4l-4 5 4 5v4" /></Icon>;
}

export function PassIcon(props: IconProps) {
  return <Icon {...props}><path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 7V4M9 4h6" /><path d="M3 20h18" /></Icon>;
}

export function RakeIcon(props: IconProps) {
  return <Icon {...props}><path d="m5 20 10-10M13 5l6 6M12 6l2-2 6 6-2 2M4 16l4 4" /></Icon>;
}

export function PauseIcon(props: IconProps) {
  return <Icon {...props}><path d="M8 5v14M16 5v14" /></Icon>;
}

export function FocusIcon(props: IconProps) {
  return <Icon {...props}><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /><path d="M9 12h6" /></Icon>;
}

export function ArrowIcon(props: IconProps) {
  return <Icon {...props}><path d="M5 12h14M14 7l5 5-5 5" /></Icon>;
}
