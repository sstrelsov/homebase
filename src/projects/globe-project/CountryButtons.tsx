import { Button } from "@nextui-org/react";
import Flag from "react-flagpack";
import useAtOrAboveBreakpoint from "../../utils/useAtOrAboveBreakpoint";

const MAX_BUTTONS_VISIBLE_MOBILE = 5;
const MAX_BUTTONS_VISIBLE_DESKTOP = 10;
const BUTTON_WIDTH_PX = 64;
interface CountryButtonProps {
  isos: string[]; // Must be alpha-3
  onClick?: (iso: string) => void;
}

const CountryButtons = ({ isos, onClick }: CountryButtonProps) => {
  const handleClick = (iso: string) => {
    onClick?.(iso);
  };

  // Use a breakpoint to decide how many buttons we display before scroll
  const isSmUp = useAtOrAboveBreakpoint("sm");
  const maxButtonCount = isSmUp
    ? MAX_BUTTONS_VISIBLE_DESKTOP
    : MAX_BUTTONS_VISIBLE_MOBILE;

  const maxWidth = maxButtonCount * BUTTON_WIDTH_PX;

  return (
    <div
      className="flex flex-row gap-2 overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]
"
      style={{ maxWidth }}
    >
      {isos.map((iso) => (
        <Button
          size="md"
          variant="light"
          key={iso}
          isIconOnly
          onPress={() => handleClick(iso)}
        >
          <Flag code={iso} hasBorder={false} size="l" />
        </Button>
      ))}
    </div>
  );
};

export default CountryButtons;
