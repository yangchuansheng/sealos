import { useEffect, useRef, useState } from 'react';

export interface KubeBadgeProps {
  label: React.ReactNode;
  disabled?: boolean;
  expandable?: boolean;
  color?: { textColor?: string; backgroundColor?: string };
}

export const KubeBadge = ({
  label,
  expandable = true,
  color,
  disabled = false
}: KubeBadgeProps) => {
  const elem = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExpandable, setIsExpandable] = useState(false);

  useEffect(() => {
    const { offsetWidth = 0, scrollWidth = 0 } = elem.current ?? {};

    setIsExpandable(expandable && offsetWidth < scrollWidth);
  }, [expandable, elem.current]);

  const onClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    console.log(e.target);
    if (isExpandable) {
      setIsExpanded(!isExpanded);
    }
    e.stopPropagation();
  };

  const { textColor, backgroundColor } = color ?? {};
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : 'opacity-100 cursor-pointer';

  return (
    <div
      className={`inline-block py-2 px-2 mr-1 max-w-full rounded-[4px] text-xs font-medium ${disabledClass}
        ${isExpanded ? '' : 'truncate'} ${
        backgroundColor ? `bg-${backgroundColor}` : 'bg-[#EFF0F1]'
      }
      `}
      onClick={onClick}
      ref={elem}
    >
      <span className={textColor ? `text-${textColor}` : 'text-black'}>{label}</span>
    </div>
  );
};
