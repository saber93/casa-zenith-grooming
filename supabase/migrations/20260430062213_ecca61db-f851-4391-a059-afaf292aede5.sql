
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ TIGHTEN BOOKINGS (admin-only read/update) ============
DROP POLICY IF EXISTS "Public can read bookings temporarily" ON public.bookings;
DROP POLICY IF EXISTS "Public can update booking status temporarily" ON public.bookings;

CREATE POLICY "Admins can read all bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bookings"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ TIGHTEN CUSTOMERS ============
DROP POLICY IF EXISTS "Public can read customers" ON public.customers;
DROP POLICY IF EXISTS "Public can update customers" ON public.customers;

CREATE POLICY "Admins can read customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ SEED SERVICES ============
INSERT INTO public.services (slug_en, slug_ar, title_en, title_ar, short_description_en, short_description_ar, description_en, description_ar, price, duration_minutes) VALUES
('classic-haircut', 'قص-الشعر-الكلاسيكي', 'Classic Haircut', 'قص الشعر الكلاسيكي',
  'Precision cut tailored to your face shape and lifestyle.',
  'قصة شعر دقيقة مصممة خصيصاً لشكل وجهك ونمط حياتك.',
  'A signature Casa haircut performed by a senior stylist. Consultation, scissor and clipper work, hot towel finish, and a refined style — built around how you actually wear your hair.',
  'قصة شعر مميزة من كازا ينفذها مصفف شعر محترف. استشارة، عمل بالمقص والماكينة، لمسة نهائية بالمنشفة الساخنة، وتصفيف راقٍ مصمم حسب أسلوبك.',
  150, 45),
('beard-trim-styling', 'تهذيب-اللحية', 'Beard Trim & Styling', 'تهذيب وتصفيف اللحية',
  'Sharp lines, soft skin, signature shape.',
  'خطوط دقيقة، بشرة ناعمة، شكل مميز.',
  'Hot towel prep, precision line-up with straight razor, beard sculpting, and a finishing oil tailored to your beard type.',
  'تحضير بالمنشفة الساخنة، تحديد دقيق بشفرة الحلاقة، نحت اللحية، وزيت لمسة نهائية مناسب لنوع لحيتك.',
  100, 30),
('haircut-beard-package', 'باقة-قص-الشعر-واللحية', 'Haircut + Beard Package', 'باقة قص الشعر واللحية',
  'The full Casa look — head to chin.',
  'إطلالة كازا الكاملة — من الرأس حتى الذقن.',
  'Our most-booked service. A full haircut paired with a precision beard trim, both finished with hot towel and styling products.',
  'خدمتنا الأكثر طلباً. قصة شعر كاملة مع تهذيب دقيق للحية، مع لمسات نهائية بالمنشفة الساخنة ومنتجات التصفيف.',
  220, 75),
('facial-care', 'العناية-بالوجه', 'Facial Care', 'العناية بالوجه',
  'Deep cleanse, exfoliation, and a calmer complexion.',
  'تنظيف عميق، تقشير، وبشرة أكثر هدوءاً.',
  'A men''s facial built around deep cleansing, gentle exfoliation, steam, extraction where needed, and a calming finishing balm.',
  'علاج وجه للرجال يشمل تنظيفاً عميقاً، تقشيراً لطيفاً، بخاراً، استخراجاً عند الحاجة، وبلسم نهائي مهدئ.',
  180, 45),
('hair-coloring', 'صبغ-الشعر', 'Hair Coloring', 'صبغ الشعر',
  'Subtle grey blending or full color, done right.',
  'دمج خفيف للشيب أو صبغة كاملة، بإتقان.',
  'From discreet grey blending to a full-color refresh. We use ammonia-low, scalp-friendly formulas tailored to your tone.',
  'من دمج الشيب الخفيف إلى تجديد كامل للون. نستخدم تركيبات منخفضة الأمونيا ولطيفة على فروة الرأس مصممة حسب لون بشرتك.',
  250, 60),
('groom-package', 'باقة-العريس', 'Groom Package', 'باقة العريس',
  'The full ceremony — for the day that matters.',
  'الطقوس الكاملة — لليوم الذي يهم.',
  'A complete grooming experience for grooms and special occasions: haircut, beard sculpt, facial, and a finishing styling session.',
  'تجربة عناية كاملة للعرسان والمناسبات الخاصة: قصة شعر، نحت لحية، علاج وجه، وجلسة تصفيف نهائية.',
  450, 120),
('kids-haircut', 'قص-شعر-الأطفال', 'Kids Haircut', 'قص شعر الأطفال',
  'Calm, careful, and quick — for ages 4–12.',
  'هادئ، دقيق، وسريع — للأعمار من 4 إلى 12.',
  'A focused haircut for kids in a relaxed setting. Patient stylists, modern cuts, and a small treat at the end.',
  'قصة شعر مركزة للأطفال في أجواء مريحة. مصففون صبورون، قصات عصرية، ومكافأة صغيرة في النهاية.',
  80, 30),
('home-barber-service', 'خدمة-الحلاق-المنزلية', 'Home Barber Service', 'خدمة الحلاق المنزلية',
  'Casa-quality grooming, in your living room.',
  'عناية بجودة كازا، في غرفة معيشتك.',
  'We bring the chair to you. A Casa-trained barber arrives with sterilized tools and full setup for a private, premium service at home.',
  'نأتي إليك بالكرسي. حلاق مدرب من كازا يصل بأدوات معقمة وإعداد كامل لخدمة خاصة وفاخرة في المنزل.',
  300, 60);

-- ============ SEED PRODUCTS ============
INSERT INTO public.products (slug_en, slug_ar, name_en, name_ar, description_en, description_ar, price, whatsapp_order_text_en, whatsapp_order_text_ar) VALUES
('beard-oil', 'زيت-اللحية', 'Casa Beard Oil', 'زيت لحية كازا',
  'Lightweight, non-greasy beard oil with argan and jojoba.',
  'زيت لحية خفيف وغير دهني مع زيت الأركان والجوجوبا.',
  120, 'Hi Casa, I''d like to order Casa Beard Oil.', 'مرحباً كازا، أود طلب زيت لحية كازا.'),
('hair-pomade', 'بومادة-الشعر', 'Matte Hair Pomade', 'بومادة شعر مطفية',
  'Strong hold, matte finish — flexible all day.',
  'تثبيت قوي بلمسة مطفية — مرنة طوال اليوم.',
  90, 'Hi Casa, I''d like to order Matte Hair Pomade.', 'مرحباً كازا، أود طلب بومادة الشعر المطفية.'),
('shampoo', 'الشامبو', 'Daily Shampoo', 'شامبو يومي',
  'Sulfate-free daily shampoo for all hair types.',
  'شامبو يومي خالٍ من السلفات لجميع أنواع الشعر.',
  85, 'Hi Casa, I''d like to order Daily Shampoo.', 'مرحباً كازا، أود طلب الشامبو اليومي.'),
('face-wash', 'غسول-الوجه', 'Charcoal Face Wash', 'غسول وجه بالفحم',
  'Detoxifying charcoal cleanser for clear skin.',
  'غسول الفحم لتنظيف عميق وبشرة صافية.',
  95, 'Hi Casa, I''d like to order Charcoal Face Wash.', 'مرحباً كازا، أود طلب غسول الوجه بالفحم.'),
('aftershave', 'مرطب-بعد-الحلاقة', 'Aftershave Balm', 'بلسم ما بعد الحلاقة',
  'Soothing aftershave balm to calm skin.',
  'بلسم ما بعد الحلاقة لتهدئة البشرة.',
  110, 'Hi Casa, I''d like to order Aftershave Balm.', 'مرحباً كازا، أود طلب بلسم ما بعد الحلاقة.'),
('cologne', 'الكولونيا', 'Casa Signature Cologne', 'عطر كازا المميز',
  'Warm woody cologne with cardamom and amber.',
  'عطر كولونيا دافئ بالخشب والهيل والعنبر.',
  280, 'Hi Casa, I''d like to order Casa Signature Cologne.', 'مرحباً كازا، أود طلب عطر كازا المميز.');

-- ============ SEED BARBERS ============
INSERT INTO public.barbers (name_en, name_ar, bio_en, bio_ar) VALUES
('Yusuf', 'يوسف', 'Senior stylist with 12+ years specialising in classic and modern cuts.', 'مصفف شعر محترف بخبرة تزيد عن 12 عاماً متخصص في القصات الكلاسيكية والعصرية.'),
('Karim', 'كريم', 'Master barber known for precision beard work and razor finishes.', 'حلاق محترف معروف بدقة عمل اللحية ولمسات الشفرة النهائية.'),
('Omar', 'عمر', 'Color and treatment specialist with a calm, friendly chair-side manner.', 'متخصص في الصبغ والعلاجات مع أسلوب هادئ وودود.');
