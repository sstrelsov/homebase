import { Button, Card, CardBody, CardHeader } from "@nextui-org/react";
import { trips } from "../data/trips";
import {
  getCitiesTraveled,
  getCountriesTraveled,
  getMilesTraveled,
} from "../utils/tripStats";

interface StatButtonProps {
  stat: number;
  suffix?: string;
  onClick?: () => void;
}

const StatButton = ({ onClick, stat, suffix }: StatButtonProps) => {
  return (
    <Button onPress={onClick} className="text-medium" size="md" variant="light">
      {stat.toLocaleString()} {suffix}
    </Button>
  );
};

interface TravelStatsCardProps {
  onCountryStatClick: () => void;
  onCityStatClick: () => void;
  onMilesStatClick: () => void;
}

const TravelStatsCard = ({
  onCountryStatClick,
  onCityStatClick,
  onMilesStatClick,
}: TravelStatsCardProps) => {
  const miles = getMilesTraveled({ trips });
  const countries = getCountriesTraveled({ trips }).length;
  const cities = getCitiesTraveled({ trips }).length;
  return (
    <Card
      shadow="none"
      classNames={{
        base: "bg-transparent",
        header: "justify-center pb-0",
        body: "text-medium py-1",
      }}
    >
      <CardHeader>World Travels</CardHeader>
      <CardBody>
        <div className="flex flex-row items-center">
          <StatButton onClick={onMilesStatClick} stat={miles} suffix="miles" />|
          <StatButton
            onClick={onCountryStatClick}
            stat={countries}
            suffix="countries"
          />
          |
          <StatButton onClick={onCityStatClick} stat={cities} suffix="cities" />
        </div>
      </CardBody>
    </Card>
  );
};

export default TravelStatsCard;
