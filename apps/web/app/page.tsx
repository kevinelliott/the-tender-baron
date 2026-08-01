import { ServiceShell } from "@/components/service-shell";
import { firstServiceFixture } from "@/fixtures/first-service";

export default function Home() {
  return <ServiceShell fixture={firstServiceFixture} />;
}
