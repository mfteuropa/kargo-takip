-- CreateTable
CREATE TABLE "Manifest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACIK',
    "truckPlate" TEXT,
    "notes" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerCode" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Customer" ("createdAt", "customerCode", "id", "name", "phoneNumber", "updatedAt") SELECT "createdAt", "customerCode", "id", "name", "phoneNumber", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_customerCode_key" ON "Customer"("customerCode");
CREATE TABLE "new_Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackingNumber" TEXT NOT NULL,
    "supplierName" TEXT,
    "senderName" TEXT,
    "senderAddress" TEXT,
    "senderPhone" TEXT,
    "receiverName" TEXT,
    "receiverCompany" TEXT,
    "receiverAddress" TEXT,
    "receiverPhone" TEXT,
    "country" TEXT,
    "dimensions" TEXT,
    "weight" REAL,
    "volume" REAL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "paymentMethod" TEXT,
    "currentStatus" TEXT NOT NULL DEFAULT 'MERKEZ_DEPO',
    "truckNumber" TEXT,
    "shippingWeek" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerId" TEXT,
    "manifestId" TEXT,
    CONSTRAINT "Shipment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shipment_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "Manifest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Shipment" ("country", "createdAt", "currentStatus", "customerId", "dimensions", "id", "paymentMethod", "quantity", "receiverAddress", "receiverCompany", "receiverName", "receiverPhone", "senderAddress", "senderName", "senderPhone", "shippingWeek", "supplierName", "trackingNumber", "truckNumber", "updatedAt", "weight") SELECT "country", "createdAt", "currentStatus", "customerId", "dimensions", "id", "paymentMethod", "quantity", "receiverAddress", "receiverCompany", "receiverName", "receiverPhone", "senderAddress", "senderName", "senderPhone", "shippingWeek", "supplierName", "trackingNumber", "truckNumber", "updatedAt", "weight" FROM "Shipment";
DROP TABLE "Shipment";
ALTER TABLE "new_Shipment" RENAME TO "Shipment";
CREATE UNIQUE INDEX "Shipment_trackingNumber_key" ON "Shipment"("trackingNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
