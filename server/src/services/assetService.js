import Asset from "../models/Asset.js";
import { nextSequence } from "../models/Counter.js";
import { formatSequence } from "../utils/numbering.js";

export async function createAsset(input) {
  const seq = await nextSequence("AST");
  const assetId = formatSequence("AST", seq);
  return Asset.create({ ...input, assetId });
}
