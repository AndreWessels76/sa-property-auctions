import { SheriffImporter } from "./sheriff";
import { BankImporter } from "./bank";
import { AuctioneerImporter } from "./auctioneers";
import { CsvImporter } from "./csv";

export const importers = {
  Sheriff: new SheriffImporter(),
  Bank: new BankImporter(),
  Auctioneers: new AuctioneerImporter(),
  CSV: new CsvImporter(),
};