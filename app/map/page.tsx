import type { Metadata } from "next";
import { MapView } from "@/components/map/MapView";

export const metadata: Metadata = {
  title: "方言地图",
};

export default function MapPage() {
  return <MapView />;
}