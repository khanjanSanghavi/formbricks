"use client";

import { DeleteDialog } from "@formbricks/ui/DeleteDialog";
import { Button } from "@formbricks/ui/Button";
import { Input } from "@formbricks/ui/Input";
import { Label } from "@formbricks/ui/Label";
import { TrashIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { TWebhook, TWebhookInput } from "@formbricks/types/v1/webhooks";
import { deleteWebhookAction, updateWebhookAction } from "../actions";
import { TPipelineTrigger } from "@formbricks/types/v1/pipelines";
import { TSurvey } from "@formbricks/types/v1/surveys";
import { testEndpoint } from "@/app/(app)/environments/[environmentId]/integrations/webhooks/components/testEndpoint";
import { triggers } from "@/app/(app)/environments/[environmentId]/integrations/webhooks/components/HardcodedTriggers";
import TriggerCheckboxGroup from "@/app/(app)/environments/[environmentId]/integrations/webhooks/components/TriggerCheckboxGroup";
import SurveyCheckboxGroup from "@/app/(app)/environments/[environmentId]/integrations/webhooks/components/SurveyCheckboxGroup";

interface ActionSettingsTabProps {
  environmentId: string;
  webhook: TWebhook;
  surveys: TSurvey[];
  setOpen: (v: boolean) => void;
}

export default function WebhookSettingsTab({
  environmentId,
  webhook,
  surveys,
  setOpen,
}: ActionSettingsTabProps) {
  const router = useRouter();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: webhook.name,
      url: webhook.url,
      triggers: webhook.triggers,
      surveyIds: webhook.surveyIds,
    },
  });

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isUpdatingWebhook, setIsUpdatingWebhook] = useState(false);
  const [selectedTriggers, setSelectedTriggers] = useState<TPipelineTrigger[]>(webhook.triggers);
  const [selectedSurveys, setSelectedSurveys] = useState<string[]>(webhook.surveyIds);
  const [testEndpointInput, setTestEndpointInput] = useState(webhook.url);
  const [endpointAccessible, setEndpointAccessible] = useState<boolean>();
  const [hittingEndpoint, setHittingEndpoint] = useState<boolean>(false);
  const [selectedAllSurveys, setSelectedAllSurveys] = useState(webhook.surveyIds.length === 0);

  const handleTestEndpoint = async (sendSuccessToast: boolean) => {
    try {
      setHittingEndpoint(true);
      await testEndpoint(testEndpointInput);
      setHittingEndpoint(false);
      if (sendSuccessToast) toast.success("Yay! We are able to ping the webhook!");
      setEndpointAccessible(true);
      return true;
    } catch (err) {
      setHittingEndpoint(false);
      toast.error("Oh no! We are unable to ping the webhook!");
      setEndpointAccessible(false);
      return false;
    }
  };

  const handleSelectAllSurveys = () => {
    setSelectedAllSurveys(!selectedAllSurveys);
    setSelectedSurveys([]);
  };

  const handleSelectedSurveyChange = (surveyId) => {
    setSelectedSurveys((prevSelectedSurveys) => {
      if (prevSelectedSurveys.includes(surveyId)) {
        return prevSelectedSurveys.filter((id) => id !== surveyId);
      } else {
        return [...prevSelectedSurveys, surveyId];
      }
    });
  };

  const handleCheckboxChange = (selectedValue) => {
    setSelectedTriggers((prevValues) => {
      if (prevValues.includes(selectedValue)) {
        return prevValues.filter((value) => value !== selectedValue);
      } else {
        return [...prevValues, selectedValue];
      }
    });
  };

  const onSubmit = async (data) => {
    if (selectedTriggers.length === 0) {
      toast.error("Please select at least one trigger");
      return;
    }

    if (!selectedAllSurveys && selectedSurveys.length === 0) {
      toast.error("Please select at least one survey");
      return;
    }
    const endpointHitSuccessfully = await handleTestEndpoint(false);
    if (!endpointHitSuccessfully) {
      return;
    }

    const updatedData: TWebhookInput = {
      name: data.name,
      url: data.url as string,
      source: data.source,
      triggers: selectedTriggers,
      surveyIds: selectedSurveys,
    };
    setIsUpdatingWebhook(true);
    await updateWebhookAction(environmentId, webhook.id, updatedData);
    toast.success("Webhook updated successfully.");
    router.refresh();
    setIsUpdatingWebhook(false);
    setOpen(false);
  };

  return (
    <div>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="col-span-1">
          <Label htmlFor="Name">Name</Label>
          <div className="mt-1 flex">
            <Input
              type="text"
              id="name"
              {...register("name")}
              defaultValue={webhook.name ?? ""}
              placeholder="Optional: Label your webhook for easy identification"
            />
          </div>
        </div>

        <div className="col-span-1">
          <Label htmlFor="URL">URL</Label>
          <div className="mt-1 flex">
            <Input
              {...register("url", {
                value: testEndpointInput,
              })}
              type="text"
              value={testEndpointInput}
              onChange={(e) => {
                setTestEndpointInput(e.target.value);
              }}
              readOnly={webhook.source !== "user"}
              className={clsx(
                webhook.source === "user" ? null : "cursor-not-allowed bg-gray-100 text-gray-500",
                endpointAccessible === true
                  ? "border-green-500 bg-green-50"
                  : endpointAccessible === false
                  ? "border-red-200 bg-red-50"
                  : endpointAccessible === undefined
                  ? "border-slate-200 bg-white"
                  : null
              )}
              placeholder="Paste the URL you want the event to trigger on"
            />
            <Button
              type="button"
              variant="secondary"
              loading={hittingEndpoint}
              className="ml-2 whitespace-nowrap"
              onClick={() => {
                handleTestEndpoint(true);
              }}>
              Test Endpoint
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="Triggers">Triggers</Label>
          <TriggerCheckboxGroup
            triggers={triggers}
            selectedTriggers={selectedTriggers}
            onCheckboxChange={handleCheckboxChange}
            allowChanges={webhook.source === "user"}
          />
        </div>

        <div>
          <Label htmlFor="Surveys">Surveys</Label>
          <SurveyCheckboxGroup
            surveys={surveys}
            selectedSurveys={selectedSurveys}
            selectedAllSurveys={selectedAllSurveys}
            onSelectAllSurveys={handleSelectAllSurveys}
            onSelectedSurveyChange={handleSelectedSurveyChange}
            allowChanges={webhook.source === "user"}
          />
        </div>

        <div className="flex justify-between border-t border-slate-200 py-6">
          <div>
            {webhook.source === "user" && (
              <Button
                type="button"
                variant="warn"
                onClick={() => setOpenDeleteDialog(true)}
                StartIcon={TrashIcon}
                className="mr-3">
                Delete
              </Button>
            )}

            <Button
              variant="secondary"
              href="https://formbricks.com/docs/webhook-api/overview"
              target="_blank">
              Read Docs
            </Button>
          </div>

          <div className="flex space-x-2">
            <Button type="submit" variant="darkCTA" loading={isUpdatingWebhook}>
              Save changes
            </Button>
          </div>
        </div>
      </form>
      <DeleteDialog
        open={openDeleteDialog}
        setOpen={setOpenDeleteDialog}
        deleteWhat={"Webhook"}
        text="Are you sure you want to delete this Webhook? This will stop sending you any further notifications."
        onDelete={async () => {
          setOpen(false);
          try {
            await deleteWebhookAction(webhook.id);
            router.refresh();
            toast.success("Webhook deleted successfully");
          } catch (error) {
            toast.error("Something went wrong. Please try again.");
          }
        }}
      />
    </div>
  );
}
