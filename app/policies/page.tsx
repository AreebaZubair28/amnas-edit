"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

type SiteSetting = {
  setting_key: string;
  setting_value: string;
};

type PolicySection = {
  key:
    | "delivery_policy"
    | "return_policy"
    | "preorder_policy"
    | "in_stock_policy"
    | "customs_hold_delay_policy"
    | "privacy_policy"
    | "terms_conditions";
  title: string;
};

const policySections: PolicySection[] = [
  {
    key: "delivery_policy",
    title: "Delivery Policy",
  },
  {
    key: "return_policy",
    title: "Return & Exchange Policy",
  },
  {
    key: "preorder_policy",
    title: "Preorder Policy",
  },
  {
    key: "in_stock_policy",
    title: "In-Stock Policy",
  },
  {
    key: "customs_hold_delay_policy",
    title: "Customs Hold & Delay Policy",
  },
  {
    key: "privacy_policy",
    title: "Privacy Policy",
  },
  {
    key: "terms_conditions",
    title: "Terms & Conditions",
  },
];

export default function PoliciesPage() {
  const [settings, setSettings] =
    useState<Record<string, string>>(
      {}
    );

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function loadSettings() {
      const {
        data,
        error,
      } = await supabase()
        .from("site_settings")
        .select(
          "setting_key, setting_value"
        );

      if (!error && data) {
        const mapped: Record<
          string,
          string
        > = {};

        (data as SiteSetting[]).forEach(
          (setting) => {
            mapped[
              setting.setting_key
            ] =
              setting.setting_value ||
              "";
          }
        );

        setSettings(mapped);
      }

      setLoading(false);
    }

    loadSettings();
  }, []);

  return (
    <main className="admin-page">
      <header className="site-header">
        <a
          href="/"
          className="logo"
        >
          Amna&apos;s{" "}
          <span>Edit</span>
        </a>

        <nav>
          <a href="/">
            Home
          </a>

          <a href="/collection">
            Collection
          </a>
        </nav>
      </header>

      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding:
            "90px 7vw 110px",
        }}
      >
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            marginBottom: 28,
            color:
              "var(--muted)",
            fontSize: 12,
          }}
        >
          <ArrowLeft
            size={15}
          />
          Back to home
        </a>

        <p className="kicker">
          AMNA&apos;S EDIT
        </p>

        <h1
          style={{
            font:
              'normal 52px Georgia, "Times New Roman", serif',
            margin:
              "0 0 18px",
            lineHeight: 1.05,
          }}
        >
          Policies &amp;
          Information
        </h1>

        <p
          style={{
            maxWidth: 650,
            color:
              "var(--muted)",
            fontSize: 14,
            lineHeight: 1.8,
            margin:
              "0 0 55px",
          }}
        >
          Please review the
          following information
          before placing an
          order with Amna&apos;s
          Edit.
        </p>

        {loading ? (
          <div className="empty">
            Loading information...
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            {policySections.map(
              (section) => {
                const content =
                  settings[
                    section.key
                  ]?.trim();

                /*
                 * Do not show empty policy
                 * sections. They can be
                 * added later from the
                 * admin dashboard.
                 */
                if (!content) {
                  return null;
                }

                return (
                  <section
                    key={
                      section.key
                    }
                    style={{
                      background:
                        "#fff",
                      border:
                        "1px solid var(--line)",
                      padding:
                        "28px 30px",
                      borderRadius:
                        6,
                    }}
                  >
                    <h2
                      style={{
                        font:
                          'normal 25px Georgia, "Times New Roman", serif',
                        margin:
                          "0 0 14px",
                        color:
                          "var(--ink)",
                      }}
                    >
                      {
                        section.title
                      }
                    </h2>

                    <div
                      style={{
                        color:
                          "var(--muted)",
                        fontSize: 13,
                        lineHeight: 1.9,
                        whiteSpace:
                          "pre-line",
                      }}
                    >
                      {content}
                    </div>
                  </section>
                );
              }
            )}

            {!policySections.some(
              (section) =>
                settings[
                  section.key
                ]?.trim()
            ) && (
              <div className="empty">
                Policy information
                has not been added
                yet.
              </div>
            )}
          </div>
        )}
      </section>

      <footer>
        <div className="logo">
          Amna&apos;s{" "}
          <span>Edit</span>
        </div>

        <p>
          Curated pieces.
          Personal service.
        </p>
      </footer>
    </main>
  );
}
