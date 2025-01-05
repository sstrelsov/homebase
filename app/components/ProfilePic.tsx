import { Image } from "@nextui-org/react";
import { useTheme } from "@nextui-org/use-theme";
import { useEffect } from "react";
import { ClientOnly } from "remix-utils/client-only";
import { setRandomColor } from "~/store/colorSlice";
import { useAppDispatch } from "~/store/hooks";

const ImageThemeChanger = () => {
  const dispatch = useAppDispatch();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    dispatch(setRandomColor(theme));
  }, []);

  const handleImageClick = () => {
    dispatch(setRandomColor(theme === "light" ? "dark" : "light"));
    setTheme(theme === "light" ? "dark" : "light");
  };
  return (
    <Image
      className="
          relative
          hover:cursor-pointer 
          transition-transform
          duration-300
          ease-in-out
          hover:scale-105
          active:scale-95
          xl:w-72
          sm:w-60
          w-52
        "
      src="/images/strelsov-headshot.png"
      alt="Spencer Strelsov Headshot"
      isBlurred
      onClick={handleImageClick}
    />
  );
};

const ProfilePic = () => {
  return (
    <ClientOnly fallback={<div>Loading...</div>}>
      {() => <ImageThemeChanger />}
    </ClientOnly>
  );
};

export default ProfilePic;
