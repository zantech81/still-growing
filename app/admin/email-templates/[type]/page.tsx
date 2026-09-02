import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_TEMPLATE_TYPES, type EmailTemplateType } from "@/lib/emailTemplates";
import EmailTemplateEditor from "@/components/admin/EmailTemplateEditor";

function isValidType(type: string): type is EmailTemplateType {
  return (EMAIL_TEMPLATE_TYPES as readonly string[]).includes(type);
}

export default async function EditEmailTemplatePage({ params }: { params: { type: string } }) {
  if (!isValidType(params.type)) notFound();

  const supabase = createClient();
  const { data: row } = await supabase
    .from("email_templates")
    .select("type, subject, heading, body, button_label")
    .eq("type", params.type)
    .maybeSingle();

  return <EmailTemplateEditor type={params.type} initialRow={row} />;
}
