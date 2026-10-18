insert into public.listings (
  kind,
  title,
  organization,
  city,
  summary,
  tags,
  source_url,
  details,
  verification_status,
  verified,
  is_published
)
values
  (
    'Products',
    '5V Voltage Regulator',
    'Not specified',
    'Online',
    'Single-unit price supplied for DigiKey India. Check the retailer listing for current price and availability before purchase.',
    array['Voltage regulator'],
    'https://www.digikey.in/en/products/result?keywords=LM7805SX%2FNOPB',
    jsonb_build_object(
      'mpn', 'LM7805SX/NOPB',
      'category', 'Voltage regulator',
      'imageUrl', '',
      'offers', jsonb_build_array(jsonb_build_object(
        'seller', 'DigiKey India',
        'price', 177.72,
        'currency', 'INR',
        'quantity', 1,
        'stock', null,
        'moq', null,
        'sellerUrl', 'https://www.digikey.in/en/products/result?keywords=LM7805SX%2FNOPB',
        'checkedAt', '2026-10-18'
      ))
    ),
    'verified',
    true,
    true
  ),
  (
    'Products',
    '555 Timer IC',
    'Not specified',
    'Online',
    'Single-unit prices supplied for DigiKey India and Mouser India. Compare both retailer listings and confirm current price and availability before purchase.',
    array['Timer IC'],
    'https://www.digikey.in/en/products/result?keywords=NE555PWR',
    jsonb_build_object(
      'mpn', 'NE555PWR',
      'category', 'Timer IC',
      'imageUrl', '',
      'offers', jsonb_build_array(
        jsonb_build_object(
          'seller', 'DigiKey India',
          'price', 28.67,
          'currency', 'INR',
          'quantity', 1,
          'stock', null,
          'moq', null,
          'sellerUrl', 'https://www.digikey.in/en/products/result?keywords=NE555PWR',
          'checkedAt', '2026-10-18'
        ),
        jsonb_build_object(
          'seller', 'Mouser India',
          'price', 28.66,
          'currency', 'INR',
          'quantity', 1,
          'stock', null,
          'moq', null,
          'sellerUrl', 'https://www.mouser.in/c/?q=NE555PWR',
          'checkedAt', '2026-10-18'
        )
      )
    ),
    'verified',
    true,
    true
  ),
  (
    'Products',
    'Rectifier Diode',
    'Not specified',
    'Online',
    'Single-unit price supplied for DigiKey India. Check the retailer listing for current price and availability before purchase.',
    array['Rectifier diode'],
    'https://www.digikey.in/en/products/result?keywords=1N4007G',
    jsonb_build_object(
      'mpn', '1N4007G',
      'category', 'Rectifier diode',
      'imageUrl', '',
      'offers', jsonb_build_array(jsonb_build_object(
        'seller', 'DigiKey India',
        'price', 23.89,
        'currency', 'INR',
        'quantity', 1,
        'stock', null,
        'moq', null,
        'sellerUrl', 'https://www.digikey.in/en/products/result?keywords=1N4007G',
        'checkedAt', '2026-10-18'
      ))
    ),
    'verified',
    true,
    true
  ),
  (
    'Products',
    '12V Voltage Regulator',
    'Not specified',
    'Online',
    'Single-unit price supplied for DigiKey India. Check the retailer listing for current price and availability before purchase.',
    array['Voltage regulator'],
    'https://www.digikey.in/en/products/result?keywords=L7812CD2T-TR',
    jsonb_build_object(
      'mpn', 'L7812CD2T-TR',
      'category', 'Voltage regulator',
      'imageUrl', '',
      'offers', jsonb_build_array(jsonb_build_object(
        'seller', 'DigiKey India',
        'price', 92.68,
        'currency', 'INR',
        'quantity', 1,
        'stock', null,
        'moq', null,
        'sellerUrl', 'https://www.digikey.in/en/products/result?keywords=L7812CD2T-TR',
        'checkedAt', '2026-10-18'
      ))
    ),
    'verified',
    true,
    true
  ),
  (
    'Products',
    '8-bit Microcontroller',
    'Not specified',
    'Online',
    'Single-unit prices supplied for Mouser India. This part card contains different package and ordering variants; select the exact manufacturer part number before purchase.',
    array['Microcontroller'],
    'https://www.mouser.in/c/?q=ATMEGA328P-ANR',
    jsonb_build_object(
      'mpn', 'ATMEGA328P-ANR',
      'category', 'Microcontroller',
      'imageUrl', '',
      'offers', jsonb_build_array(jsonb_build_object(
        'seller', 'Mouser India',
        'price', 269.29,
        'currency', 'INR',
        'quantity', 1,
        'stock', null,
        'moq', null,
        'sellerUrl', 'https://www.mouser.in/c/?q=ATMEGA328P-ANR',
        'checkedAt', '2026-10-18'
      ))
    ),
    'verified',
    true,
    true
  ),
  (
    'Products',
    '8-bit Microcontroller',
    'Not specified',
    'Online',
    'Single-unit price supplied for Mouser India. This part is a separate package variant; select the exact manufacturer part number before purchase.',
    array['Microcontroller'],
    'https://www.mouser.in/c/?q=ATMEGA328P-AU',
    jsonb_build_object(
      'mpn', 'ATMEGA328P-AU',
      'category', 'Microcontroller',
      'imageUrl', '',
      'offers', jsonb_build_array(jsonb_build_object(
        'seller', 'Mouser India',
        'price', 254.14,
        'currency', 'INR',
        'quantity', 1,
        'stock', null,
        'moq', null,
        'sellerUrl', 'https://www.mouser.in/c/?q=ATMEGA328P-AU',
        'checkedAt', '2026-10-18'
      ))
    ),
    'verified',
    true,
    true
  ),
  (
    'Products',
    '8-bit Microcontroller',
    'Not specified',
    'Online',
    'Single-unit price supplied for Mouser India. This part is a separate package variant; select the exact manufacturer part number before purchase.',
    array['Microcontroller'],
    'https://www.mouser.in/c/?q=ATMEGA328P-PU',
    jsonb_build_object(
      'mpn', 'ATMEGA328P-PU',
      'category', 'Microcontroller',
      'imageUrl', '',
      'offers', jsonb_build_array(jsonb_build_object(
        'seller', 'Mouser India',
        'price', 276.11,
        'currency', 'INR',
        'quantity', 1,
        'stock', null,
        'moq', null,
        'sellerUrl', 'https://www.mouser.in/c/?q=ATMEGA328P-PU',
        'checkedAt', '2026-10-18'
      ))
    ),
    'verified',
    true,
    true
  );
