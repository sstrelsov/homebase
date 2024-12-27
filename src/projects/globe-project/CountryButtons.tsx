import { Button } from "@nextui-org/react";
import Flag from "react-flagpack";
import { selectFocusIso, setFocusIso } from "../../store/globeSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";

interface CountryButtonProps {
  isos: string[] /** Must be alpha-3 */;
}
const CountryButtons = ({ isos }: CountryButtonProps) => {
  const dispatch = useAppDispatch();
  const focusedISO = useAppSelector(selectFocusIso);
  const handleClick = (iso: string) => {
    iso === focusedISO
      ? dispatch(setFocusIso(undefined))
      : dispatch(setFocusIso(iso));
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
