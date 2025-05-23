<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = "https://www.fpds.gov/ezsearch/FEEDS/ATOM?q=PRINCIPAL_NAICS_CODE:%22511210%22%20CREATED_DATE:[2023/05/01,2025/05/23]";
$xml = simplexml_load_file($url);
$ns = $xml->getNamespaces(true);
$results = [];

foreach ($xml->entry as $entry) {
    $content = $entry->children($ns['']);
    $award = $content->children($ns['ns1'])->award;

    $agency = (string)$award->purchaserInformation->contractingOfficeAgencyID['name'];
    $office = (string)$award->purchaserInformation->contractingOfficeID['name'];
    $vendor = (string)$award->vendor->vendorHeader->vendorName;
    $desc = (string)$award->contractData->descriptionOfContractRequirement;
    $piid = (string)$award->awardID->awardContractID->PIID;
    $signed = (string)$award->relevantContractDates->signedDate;
    $amount = (string)$award->totalDollarValues->totalObligatedAmount;

    $results[] = [
        "award_id" => $piid,
        "agency" => $agency,
        "office" => $office,
        "vendor" => $vendor,
        "signed" => $signed,
        "amount" => "$" . number_format((float)$amount, 2),
        "desc" => $desc
    ];
}

echo json_encode($results);
?>