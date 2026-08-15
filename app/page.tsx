import { AscentApp } from "./components/AscentApp";
import { PortfolioProvider } from "./store/portfolio-store";
import { ConfirmationProvider } from "./components/ConfirmationDialog";

export default function Home() {
  return <PortfolioProvider><ConfirmationProvider><AscentApp /></ConfirmationProvider></PortfolioProvider>;
}
