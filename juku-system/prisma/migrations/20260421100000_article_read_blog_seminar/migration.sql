-- ArticleRead
CREATE TABLE "article_reads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "article_reads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "article_reads_user_id_article_id_key" ON "article_reads"("user_id", "article_id");
ALTER TABLE "article_reads" ADD CONSTRAINT "article_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "article_reads" ADD CONSTRAINT "article_reads_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BlogCategory
CREATE TABLE "blog_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "blog_categories_name_key" ON "blog_categories"("name");

-- BlogPost
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'both',
    "category_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "images" TEXT NOT NULL DEFAULT '[]',
    "published_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- BlogRead
CREATE TABLE "blog_reads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "blog_post_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blog_reads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "blog_reads_user_id_blog_post_id_key" ON "blog_reads"("user_id", "blog_post_id");
ALTER TABLE "blog_reads" ADD CONSTRAINT "blog_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blog_reads" ADD CONSTRAINT "blog_reads_blog_post_id_fkey" FOREIGN KEY ("blog_post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PrintUnit
CREATE TABLE "print_units" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "print_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "print_units_pkey" PRIMARY KEY ("id")
);

-- StudentPrint
CREATE TABLE "student_prints" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "print_unit_id" TEXT NOT NULL,
    "print_no" INTEGER NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "completed_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "student_prints_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "student_prints_student_id_print_unit_id_print_no_key" ON "student_prints"("student_id", "print_unit_id", "print_no");
CREATE INDEX "student_prints_scheduled_date_idx" ON "student_prints"("scheduled_date");
ALTER TABLE "student_prints" ADD CONSTRAINT "student_prints_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_prints" ADD CONSTRAINT "student_prints_print_unit_id_fkey" FOREIGN KEY ("print_unit_id") REFERENCES "print_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
