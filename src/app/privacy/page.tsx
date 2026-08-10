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
    title: `${text(dictionary.legal.privacyTitle)} | ${text(dictionary.common.appName)}`,
    description: text(dictionary.legal.privacyMetadataDescription),
  };
}

export default async function PrivacyPage() {
  const dictionary = await getRequestDictionary();
  const legal = dictionary.legal;

  return (
    <LegalPage
      title={text(legal.privacyTitle)}
      updatedAt={formatMessage(text(legal.lastUpdated), {
        date: text(legal.lastUpdatedDate),
      })}
      description={text(legal.privacyDescription)}
      sections={[
        {
          id: 'data-yang-kami-kumpulkan',
          heading: text(legal.privacyCollectionHeading),
          body: (
            <>
              <ul>
                <li>{text(legal.privacyAccountData)}</li>
                <li>{text(legal.privacyActivityData)}</li>
                <li>{text(legal.privacyTechnicalData)}</li>
              </ul>
              <p>{text(legal.privacyCollectionOther)}</p>
            </>
          ),
        },
        {
          id: 'cara-data-digunakan',
          heading: text(legal.privacyUsageHeading),
          body: (
            <ul>
              <li>{text(legal.privacyUsageIdentity)}</li>
              <li>{text(legal.privacyUsageFavorites)}</li>
              <li>{text(legal.privacyUsageDownloads)}</li>
              <li>{text(legal.privacyUsageImprove)}</li>
            </ul>
          ),
        },
        {
          id: 'penyimpanan-dan-keamanan',
          heading: text(legal.privacyStorageHeading),
          body: <p>{text(legal.privacyStorageBody)}</p>,
        },
        {
          id: 'cookie-dan-penyimpanan-lokal',
          heading: text(legal.privacyCookiesHeading),
          body: <p>{text(legal.privacyCookiesBody)}</p>,
        },
        {
          id: 'pihak-ketiga',
          heading: text(legal.privacyThirdPartyHeading),
          body: (
            <>
              <p>{text(legal.privacyThirdPartyIntro)}</p>
              <ul>
                <li>{text(legal.privacyGoogle)}</li>
                <li>{text(legal.privacySupabase)}</li>
                <li>{text(legal.privacyCloudflare)}</li>
                <li>{text(legal.privacyVercel)}</li>
              </ul>
            </>
          ),
        },
        {
          id: 'hak-anda',
          heading: text(legal.privacyRightsHeading),
          body: <p>{text(legal.privacyRightsBody)}</p>,
        },
        {
          id: 'kontak',
          heading: text(legal.privacyContactHeading),
          body: <p>{text(legal.privacyContactBody)}</p>,
        },
      ]}
    />
  );
}
