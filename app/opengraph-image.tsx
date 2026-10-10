import {
  ImageResponse,
} from "next/og";

export const alt =
  "Amna's Edit — Curated Fashion & Accessories";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType =
  "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background:
            "linear-gradient(135deg, #fffafc 0%, #f4e8ee 100%)",
          color: "#2b2026",
          fontFamily:
            "Arial, Helvetica, sans-serif",
          padding: "72px",
        }}
      >
        <div
          style={{
            fontSize: 78,
            fontWeight: 700,
            letterSpacing: "-2px",
          }}
        >
          Amna&apos;s Edit
        </div>

        <div
          style={{
            marginTop: 24,
            fontSize: 30,
            letterSpacing: "3px",
            textTransform:
              "uppercase",
            color: "#775764",
          }}
        >
          Curated Fashion &
          Accessories
        </div>

        <div
          style={{
            marginTop: 44,
            width: 130,
            height: 4,
            borderRadius: 999,
            background: "#775764",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
