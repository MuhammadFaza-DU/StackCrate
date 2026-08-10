import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { LegalPage } from '@/components/layout/LegalPage';
import { getDictionary, LOCALE_COOKIE } from '@/i18n/config';
import { formatMessage, getLocaleFromCookieValue } from '@/i18n/server';
import type { Dictionary, Message } from '@/i18n/types';

const text = (message: Message) => typeof message === 'function' ? message() : message;

async function getRequestDictionary(): Promise<Dictionary> {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookieValue(cookieStore.get(LOCALE_COOKIE)?.value);

  return getDictionary(locale);
}

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getRequestDictionary();

  return {
    title: `${text(dictionary.legal.termsTitle)} | ${text(dictionary.common.appName)}`,
    description: text(dictionary.legal.termsDescription),
  };
}

export default async function TermsPage() {
  const dictionary = await getRequestDictionary();
  const legal = dictionary.legal;

  return (
    <LegalPage
      title={text(legal.termsTitle)}
      updatedAt={formatMessage(text(legal.lastUpdated), {
        date: text(legal.lastUpdatedDate),
      })}
      sections={[
        {
          id: 'penerimaan-ketentuan',
          heading: text(legal.termsAcceptanceHeading),
          body: <p>{text(legal.termsAcceptanceBody)}</p>,
        },
        {
          id: 'layanan-yang-disediakan',
          heading: text(legal.termsServicesHeading),
          body: (
            <>
              <p>{text(legal.termsServicesBody)}</p>
              <ul>
                <li>{text(legal.termsServicesBrowse)}</li>
                <li>{text(legal.termsServicesPreview)}</li>
                <li>{text(legal.termsServicesDownload)}</li>
              </ul>
              <p>{text(legal.termsServicesFree)}</p>
            </>
          ),
        },
        {
          id: 'akun-pengguna',
          heading: text(legal.termsAccountHeading),
          body: <p>{text(legal.termsAccountBody)}</p>,
        },
        {
          id: 'penggunaan-dan-hak-atas-asset',
          heading: text(legal.termsRightsHeading),
          body: (
            <>
              <p>{text(legal.termsRightsIntro)}</p>
              <ul>
                <li>{text(legal.termsRightsPersonal)}</li>
                <li>{text(legal.termsRightsRedistribute)}</li>
                <li>{text(legal.termsRightsClaim)}</li>
              </ul>
              <p>{text(legal.termsRightsRateLimit)}</p>
            </>
          ),
        },
        {
          id: 'batasan-tanggung-jawab',
          heading: text(legal.termsLiabilityHeading),
          body: <p>{text(legal.termsLiabilityBody)}</p>,
        },
        {
          id: 'perubahan-layanan-dan-ketentuan',
          heading: text(legal.termsChangesHeading),
          body: <p>{text(legal.termsChangesBody)}</p>,
        },
        {
          id: 'kontak',
          heading: text(legal.termsContactHeading),
          body: <p>{text(legal.termsContactBody)}</p>,
        },
      ]}
    />
  );
}
