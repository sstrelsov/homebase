import { Button } from "@nextui-org/react";
import Flag from "react-flagpack";
import { setFocusIso } from "../../store/globeSlice";
import { useAppDispatch } from "../../store/hooks";

interface CountryButtonProps {
  isos: string[] /** Must be alpha-3 */;
}
const CountryButtons = ({ isos }: CountryButtonProps) => {
  const dispatch = useAppDispatch();
  const handleClick = (iso: string) => {
    dispatch(setFocusIso(iso));
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
