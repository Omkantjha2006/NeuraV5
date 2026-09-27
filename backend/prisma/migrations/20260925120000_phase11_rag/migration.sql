CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "DocumentCollection" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentCollectionItem" (
  "collectionId" UUID NOT NULL,
  "documentId" UUID NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentCollectionItem_pkey" PRIMARY KEY ("collectionId","documentId")
);

CREATE TABLE "document_chunks" (
  "id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "chunk_index" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "page" INTEGER,
  "token_count" INTEGER,
  "embedding" vector(768) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentCollection_userId_name_key" ON "DocumentCollection"("userId","name");
CREATE INDEX "DocumentCollection_userId_updatedAt_idx" ON "DocumentCollection"("userId","updatedAt");
CREATE INDEX "DocumentCollectionItem_documentId_idx" ON "DocumentCollectionItem"("documentId");
CREATE UNIQUE INDEX "document_chunks_document_id_chunk_index_key" ON "document_chunks"("document_id","chunk_index");
CREATE INDEX "document_chunks_document_id_idx" ON "document_chunks"("document_id");
CREATE INDEX "document_chunks_embedding_hnsw_idx" ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);

ALTER TABLE "DocumentCollection" ADD CONSTRAINT "DocumentCollection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentCollectionItem" ADD CONSTRAINT "DocumentCollectionItem_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "DocumentCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentCollectionItem" ADD CONSTRAINT "DocumentCollectionItem_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
