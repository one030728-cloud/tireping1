"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import LoadingState from "@/components/LoadingState";
import { MANUFACTURERS } from "@/lib/mockData";
import type { SellerListingView } from "@/lib/seller-types";

interface FormState {
  manufacturer: string;
  model: string;
  width: string;
  ratio: string;
  rim: string;
  dot: string;
  loadIndex: string;
  speedIndex: string;
  ply: string;
  oe: string;
  season: string;
  productCode: string;
  discountRate: string;
  price: string;
  factoryPrice: string;
  stock: string;
  minOrder: string;
  tag: string;
  courier: string;
  shippingNote: string;
}

const emptyForm: FormState = {
  manufacturer: MANUFACTURERS[0] ?? "",
  model: "",
  width: "",
  ratio: "",
  rim: "",
  dot: "",
  loadIndex: "",
  speedIndex: "",
  ply: "",
  oe: "",
  season: "사계절",
  productCode: "",
  discountRate: "0",
  price: "0",
  factoryPrice: "0",
  stock: "0",
  minOrder: "1",
  tag: "",
  courier: "",
  shippingNote: "",
};

function formFromListing(listing: SellerListingView): FormState {
  return {
    manufacturer: listing.manufacturer,
    model: listing.model,
    width: String(listing.width),
    ratio: String(listing.ratio),
    rim: String(listing.rim),
    dot: listing.dot,
    loadIndex: listing.loadIndex,
    speedIndex: listing.speedIndex,
    ply: listing.ply,
    oe: listing.oe ?? "",
    season: listing.season,
    productCode: listing.productCode,
    discountRate: String(listing.discountRate),
    price: String(listing.price),
    factoryPrice: String(listing.factoryPrice),
    stock: String(listing.stock),
    minOrder: String(listing.minOrder),
    tag: listing.tag ?? "",
    courier: listing.seller.courier,
    shippingNote: listing.seller.shippingNote ?? "",
  };
}

export default function SellerListingForm({ listingId }: { listingId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [listing, setListing] = useState<SellerListingView | null>(null);
  const [loading, setLoading] = useState(Boolean(listingId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listingId) return;
    let cancelled = false;

    fetch(`/api/seller/listings/${listingId}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("상품 정보를 불러오지 못했습니다.");
        return response.json() as Promise<{ listing: SellerListingView }>;
      })
      .then((data) => {
        if (!cancelled) {
          setListing(data.listing);
          setForm(formFromListing(data.listing));
        }
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(reason.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  function setField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function persist(requestApproval: boolean) {
    setBusy(true);
    setError(null);

    const url = listingId ? `/api/seller/listings/${listingId}` : "/api/seller/listings";
    const response = await fetch(url, {
      method: listingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error === "VALIDATION_ERROR" ? "입력값을 확인해 주세요." : "상품을 저장하지 못했습니다.");
      setBusy(false);
      return;
    }

    const data = (await response.json()) as { listing: SellerListingView };
    const savedId = data.listing.id;

    if (requestApproval) {
      const submitResponse = await fetch(`/api/seller/listings/${savedId}/submit`, { method: "POST" });
      if (!submitResponse.ok) {
        setError("상품은 저장되었지만 승인 요청에 실패했습니다.");
        setBusy(false);
        return;
      }
    }

    router.push("/seller/listings");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void persist(false);
  }

  if (loading) return <LoadingState />;

  if (error && listingId && !listing) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-accent mb-4">{error}</p>
        <Link href="/seller/listings" className="text-brand font-semibold">
          상품 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 max-w-7xl">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <Link href="/seller/listings" className="text-sm text-muted hover:text-brand">
            ← 상품 목록
          </Link>
          <h1 className="text-xl font-extrabold mt-2">{listingId ? "상품 수정" : "상품 등록"}</h1>
          <p className="text-sm text-muted mt-1">
            {listingId ? "변경 내용을 저장하고 승인 상태를 확인하세요." : "상품 정보를 임시 저장한 뒤 본사에 승인 요청을 보내세요."}
          </p>
        </div>
        {listing && <StatusBadge status={listing.status} />}
      </div>

      {listing?.rejectedReason && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 text-sm text-accent p-3 mb-4">
          반려 사유: {listing.rejectedReason}
        </div>
      )}
      {error && <p className="text-sm text-accent mb-3">{error}</p>}

      <form onSubmit={handleSubmit} className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
        <div className="flex flex-col gap-5">
          <section className="card p-5">
            <h2 className="font-bold mb-4">상품 기본 정보</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="제조사" required>
                <select value={form.manufacturer} onChange={(event) => setField("manufacturer", event.target.value)} className="seller-input" required>
                  {MANUFACTURERS.map((manufacturer) => <option key={manufacturer} value={manufacturer}>{manufacturer}</option>)}
                </select>
              </Field>
              <Field label="모델명" required>
                <input value={form.model} onChange={(event) => setField("model", event.target.value)} className="seller-input" required />
              </Field>
              <Field label="단면폭" required>
                <input type="number" min="1" value={form.width} onChange={(event) => setField("width", event.target.value)} className="seller-input" required />
              </Field>
              <Field label="편평비" required>
                <input type="number" min="1" value={form.ratio} onChange={(event) => setField("ratio", event.target.value)} className="seller-input" required />
              </Field>
              <Field label="림경" required>
                <input type="number" min="1" value={form.rim} onChange={(event) => setField("rim", event.target.value)} className="seller-input" required />
              </Field>
              <Field label="생산년도(DOT)" required>
                <input value={form.dot} onChange={(event) => setField("dot", event.target.value)} className="seller-input" placeholder="2026" required />
              </Field>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-bold mb-4">상품 스펙</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <TextField label="하중지수" field="loadIndex" form={form} setField={setField} required />
              <TextField label="속도지수" field="speedIndex" form={form} setField={setField} required />
              <TextField label="타이어겹수" field="ply" form={form} setField={setField} required />
              <TextField label="OE" field="oe" form={form} setField={setField} />
              <TextField label="계절" field="season" form={form} setField={setField} required />
              <TextField label="상품번호" field="productCode" form={form} setField={setField} required />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-bold mb-4">판매 조건</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <NumberField label="공장도가" field="factoryPrice" form={form} setField={setField} required />
              <NumberField label="판매가" field="price" form={form} setField={setField} required />
              <NumberField label="할인율(%)" field="discountRate" form={form} setField={setField} required />
              <NumberField label="재고" field="stock" form={form} setField={setField} required />
              <NumberField label="최소 주문수량" field="minOrder" form={form} setField={setField} required />
              <Field label="태그">
                <select value={form.tag} onChange={(event) => setField("tag", event.target.value)} className="seller-input">
                  <option value="">없음</option>
                  <option value="EVENT">EVENT</option>
                  <option value="BEST">BEST</option>
                </select>
              </Field>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-bold mb-4">배송 안내</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <TextField label="택배사" field="courier" form={form} setField={setField} required />
              <TextField label="배송 안내 문구" field="shippingNote" form={form} setField={setField} />
            </div>
          </section>

          <div className="flex justify-end gap-2">
            <Link href="/seller/listings" className="btn-outline h-11 px-5">
              취소
            </Link>
            <button type="submit" className="btn-outline h-11 px-5" disabled={busy}>
              {busy ? "저장 중..." : "임시 저장"}
            </button>
            <button type="button" className="btn-primary h-11 px-5" disabled={busy} onClick={() => void persist(true)}>
              승인 요청
            </button>
          </div>
        </div>

        <aside className="card p-5 h-fit xl:sticky xl:top-4">
          <h2 className="font-bold mb-4">상세페이지 미리보기</h2>
          <div className="rounded-xl border border-border bg-surface-2 p-4">
            <p className="text-xs text-muted">{form.manufacturer}</p>
            <p className="font-bold mt-1">{form.model || "모델명을 입력하세요"}</p>
            <p className="text-sm text-muted mt-2">
              {form.width || "-"} / {form.ratio || "-"} R {form.rim || "-"} · DOT {form.dot || "-"}
            </p>
            <div className="border-t border-border mt-4 pt-3 flex flex-col gap-2 text-sm">
              <PreviewRow label="상품번호" value={form.productCode || "-"} />
              <PreviewRow label="스펙" value={`${form.loadIndex || "-"} ${form.speedIndex || "-"} ${form.ply || "-"}`} />
              <PreviewRow label="판매가" value={`${Number(form.price || 0).toLocaleString()}원`} />
              <PreviewRow label="재고" value={`${Number(form.stock || 0).toLocaleString()}개`} />
            </div>
          </div>
          <p className="text-xs text-muted leading-relaxed mt-3">
            공장도가는 1차 정책에 따라 판매자가 입력합니다. 가격과 재고 변경은 이력으로 기록됩니다.
          </p>
        </aside>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-medium text-foreground/70">{label}{required && <span className="text-accent"> *</span>}</span>
      {children}
    </label>
  );
}

function TextField({ label, field, form, setField, required }: { label: string; field: keyof FormState; form: FormState; setField: (field: keyof FormState, value: string) => void; required?: boolean }) {
  return (
    <Field label={label} required={required}>
      <input value={form[field]} onChange={(event) => setField(field, event.target.value)} className="seller-input" required={required} />
    </Field>
  );
}

function NumberField({ label, field, form, setField, required }: { label: string; field: keyof FormState; form: FormState; setField: (field: keyof FormState, value: string) => void; required?: boolean }) {
  return (
    <Field label={label} required={required}>
      <input type="number" min="0" value={form[field]} onChange={(event) => setField(field, event.target.value)} className="seller-input" required={required} />
    </Field>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><span className="text-muted">{label}</span><span className="font-medium text-right">{value}</span></div>;
}

function StatusBadge({ status }: { status: SellerListingView["status"] }) {
  const labels: Record<SellerListingView["status"], string> = {
    DRAFT: "작성중",
    PENDING: "승인 대기",
    ACTIVE: "판매중",
    REJECTED: "반려",
    SOLDOUT: "품절",
    HIDDEN: "비노출",
  };
  return <span className="text-sm font-semibold text-brand">{labels[status]}</span>;
}
