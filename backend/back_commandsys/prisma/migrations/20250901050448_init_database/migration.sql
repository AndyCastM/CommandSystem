-- CreateTable
CREATE TABLE "public"."areas_production" (
    "id_area" INTEGER NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" VARCHAR NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "areas_production_pkey" PRIMARY KEY ("id_area")
);

-- CreateTable
CREATE TABLE "public"."commands" (
    "id_command" INTEGER NOT NULL,
    "table_id" INTEGER NOT NULL,
    "waiter_id" INTEGER NOT NULL,
    "date_creation" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR NOT NULL,

    CONSTRAINT "commands_pkey" PRIMARY KEY ("id_command")
);

-- CreateTable
CREATE TABLE "public"."commands_items" (
    "id_item" INTEGER NOT NULL,
    "command_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" VARCHAR NOT NULL,

    CONSTRAINT "commands_items_pkey" PRIMARY KEY ("id_item","command_id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id_product" INTEGER NOT NULL,
    "name" VARCHAR NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "area_id" INTEGER NOT NULL,
    "active" BOOLEAN DEFAULT true,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id_product")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id_rol" INTEGER NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" VARCHAR NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "public"."tables" (
    "id_table" INTEGER NOT NULL,
    "number" SMALLINT NOT NULL,
    "status" VARCHAR,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id_table")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id_user" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "user" VARCHAR NOT NULL,
    "password" VARCHAR NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id_user")
);

-- AddForeignKey
ALTER TABLE "public"."commands" ADD CONSTRAINT "table_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id_table") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."commands" ADD CONSTRAINT "waiter_id_fk" FOREIGN KEY ("waiter_id") REFERENCES "public"."users"("id_user") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."commands_items" ADD CONSTRAINT "command_id_fk" FOREIGN KEY ("command_id") REFERENCES "public"."commands"("id_command") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."commands_items" ADD CONSTRAINT "product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id_product") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "area_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas_production"("id_area") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "rol_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id_rol") ON DELETE NO ACTION ON UPDATE NO ACTION;
