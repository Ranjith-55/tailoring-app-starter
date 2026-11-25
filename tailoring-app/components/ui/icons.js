// Small dependency-free inline icon set (24x24 stroke icons, Heroicons-style).
// Every icon accepts standard SVG props so callers can pass className, etc.

function Icon({ children, className = "h-5 w-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (props) => (
  <Icon {...props}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </Icon>
);

export const UsersIcon = (props) => (
  <Icon {...props}>
    <circle cx="9" cy="8" r="3.25" />
    <path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" />
    <path d="M15.5 4.5a3.25 3.25 0 0 1 0 6.4" />
    <path d="M17.5 14.3c2.4.7 4 2.7 4 5.7" />
  </Icon>
);

export const PackageIcon = (props) => (
  <Icon {...props}>
    <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
    <path d="m3.7 7.7 8.3 4.4 8.3-4.4" />
    <path d="M12 12.1V21" />
    <path d="m7.5 5.2 8.3 4.4" />
  </Icon>
);

export const StaffIcon = (props) => (
  <Icon {...props}>
    <circle cx="10" cy="8" r="3.25" />
    <path d="M3.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" />
    <path d="M16.5 8.5h4M18.5 6.5v4" />
  </Icon>
);

export const ChartIcon = (props) => (
  <Icon {...props}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Icon>
);

export const LogoutIcon = (props) => (
  <Icon {...props}>
    <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
    <path d="M15.5 16.5 20 12l-4.5-4.5" />
    <path d="M20 12H9" />
  </Icon>
);

export const MenuIcon = (props) => (
  <Icon {...props}>
    <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
  </Icon>
);

export const CloseIcon = (props) => (
  <Icon {...props}>
    <path d="M5 5l14 14M19 5 5 19" />
  </Icon>
);

export const SearchIcon = (props) => (
  <Icon {...props}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m20 20-4.3-4.3" />
  </Icon>
);

export const PlusIcon = (props) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const ChevronLeftIcon = (props) => (
  <Icon {...props}>
    <path d="m15 6-6 6 6 6" />
  </Icon>
);

export const ChevronRightIcon = (props) => (
  <Icon {...props}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
);

export const ChevronDownIcon = (props) => (
  <Icon {...props}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const TrashIcon = (props) => (
  <Icon {...props}>
    <path d="M4.5 7h15" />
    <path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
    <path d="M7 7l.8 12a2 2 0 0 0 2 1.9h4.4a2 2 0 0 0 2-1.9L17 7" />
    <path d="M10.3 11v6M13.7 11v6" />
  </Icon>
);

export const PencilIcon = (props) => (
  <Icon {...props}>
    <path d="M4 20h4.2L19 9.2a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z" />
    <path d="m13.5 6.5 4 4" />
  </Icon>
);

export const WhatsAppIcon = (props) => (
  <Icon fill="currentColor" stroke="none" {...props}>
    <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.42 1.27 4.86L2 22l5.32-1.32a9.9 9.9 0 0 0 4.72 1.2h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2Zm5.83 14.24c-.25.7-1.24 1.29-2.03 1.46-.55.12-1.26.21-3.65-.78-2.98-1.23-4.9-4.19-5.05-4.38-.15-.2-1.2-1.6-1.2-3.06 0-1.45.76-2.16 1.03-2.46.27-.29.6-.36.8-.36h.58c.19 0 .44-.07.68.52.25.6.86 2.06.94 2.21.08.15.13.32.02.52-.1.2-.16.32-.31.5-.15.18-.32.4-.46.53-.15.15-.31.31-.13.6.18.3.8 1.32 1.72 2.14 1.18 1.05 2.17 1.38 2.47 1.53.3.15.48.13.65-.08.18-.2.76-.88.96-1.18.2-.3.4-.25.68-.15.28.1 1.77.83 2.07.98.3.15.5.22.57.35.08.13.08.72-.17 1.42Z" />
  </Icon>
);

export const RulerIcon = (props) => (
  <Icon {...props}>
    <path d="m4 15 9-9 5.5 5.5-9 9L4 15Z" />
    <path d="m9.5 9.5 1.4 1.4M12.5 6.5l1.4 1.4M6.5 12.5l1.4 1.4" />
  </Icon>
);

export const SettingsIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3.25" />
    <path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6" />
  </Icon>
);

export const CreditCardIcon = (props) => (
  <Icon {...props}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
    <path d="M2.5 10h19" />
    <path d="M6 14.5h4" />
  </Icon>
);

export const ReceiptIcon = (props) => (
  <Icon {...props}>
    <path d="M6 3.5h12v17l-2.5-1.5L13 20.5l-2.5-1.5L8 20.5l-2-1.5V3.5Z" />
    <path d="M9 8h6M9 11.5h6M9 15h4" />
  </Icon>
);

export const CashIcon = (props) => (
  <Icon {...props}>
    <rect x="2.5" y="6.5" width="19" height="12" rx="2" />
    <circle cx="12" cy="12.5" r="3" />
    <path d="M6 9v.01M18 16v.01" />
  </Icon>
);

export const BellIcon = (props) => (
  <Icon {...props}>
    <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </Icon>
);

export const CalendarIcon = (props) => (
  <Icon {...props}>
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </Icon>
);

export const ImageIcon = (props) => (
  <Icon {...props}>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.75" />
    <path d="m5 17 4.5-4.5a2 2 0 0 1 2.8 0L21 21" />
  </Icon>
);

export const CheckCircleIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 2.5 2.5L16 9.5" />
  </Icon>
);

export const AlertCircleIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5" />
    <path d="M12 16.2v.1" />
  </Icon>
);

export const InfoIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5" />
    <path d="M12 7.8v.1" />
  </Icon>
);

export const SpinnerIcon = (props) => (
  <Icon {...props} className={`animate-spin ${props.className || "h-5 w-5"}`}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </Icon>
);
