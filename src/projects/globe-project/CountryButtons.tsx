import { Button } from "@nextui-org/react";
import Flag from "react-flagpack";

interface CountryButtonProps {
  isos: string[] /** Must be alpha-3 */;
  onClick?: (iso: string) => void;
}
const CountryButtons = ({ isos, onClick }: CountryButtonProps) => {
  const handleClick = (iso: string) => {
    onClick?.(iso);
  };
  return (
    <>
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
    </>
  );
};

export default CountryButtons;
