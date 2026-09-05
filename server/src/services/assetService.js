import { getModels, nextSequence } from "../tenant/tenantDb.js";
import { formatSequence } from "../utils/numbering.js";

export async function createAsset(tenantDb, input) {
  const { Asset } = getModels(tenantDb);
  const seq = await nextSequence(tenantDb, "AST");
  const assetId = formatSequence("AST", seq);
  return Asset.create({ ...input, assetId });
}
