/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);

  // Update entries collection rules
  const entriesCollection = dao.findCollectionByNameOrId("entries");
  entriesCollection.listRule = "@request.auth.id != ''";
  entriesCollection.viewRule = "@request.auth.id != ''";
  dao.saveCollection(entriesCollection);

  // Update summaries collection rules
  const summariesCollection = dao.findCollectionByNameOrId("summaries");
  summariesCollection.listRule = "@request.auth.id != ''";
  summariesCollection.viewRule = "@request.auth.id != ''";
  dao.saveCollection(summariesCollection);

  return null;
}, (db) => {
  const dao = new Dao(db);

  // Revert entries collection rules to null
  const entriesCollection = dao.findCollectionByNameOrId("entries");
  entriesCollection.listRule = null;
  entriesCollection.viewRule = null;
  dao.saveCollection(entriesCollection);

  // Revert summaries collection rules to null
  const summariesCollection = dao.findCollectionByNameOrId("summaries");
  summariesCollection.listRule = null;
  summariesCollection.viewRule = null;
  dao.saveCollection(summariesCollection);

  return null;
})
