use super::*;

#[test]
fn extract_tag_meta_reads_color_and_order() {
    let json = br#"{"customCoordinates":[],"extra":{"tags":{"Roof":{"color":[255,0,0],"order":3},"Wall":{"color":[0,128,255],"order":1}}}}"#;
    let meta = extract_tag_meta(json);
    assert_eq!(meta.len(), 2);

    let roof = &meta["Roof"];
    assert_eq!(roof.color.as_deref(), Some("#ff0000"));
    assert_eq!(roof.order, Some(3));

    let wall = &meta["Wall"];
    assert_eq!(wall.color.as_deref(), Some("#0080ff"));
    assert_eq!(wall.order, Some(1));
}

#[test]
fn extract_tag_meta_missing_order() {
    let json = br#"{"extra":{"tags":{"NoOrder":{"color":[10,20,30]}}}}"#;
    let meta = extract_tag_meta(json);
    let tag = &meta["NoOrder"];
    assert_eq!(tag.color.as_deref(), Some("#0a141e"));
    assert_eq!(tag.order, None);
}

#[test]
fn extract_tag_meta_missing_color() {
    let json = br#"{"extra":{"tags":{"OnlyOrder":{"order":5}}}}"#;
    let meta = extract_tag_meta(json);
    let tag = &meta["OnlyOrder"];
    assert_eq!(tag.color, None);
    assert_eq!(tag.order, Some(5));
}

#[test]
fn extract_tag_meta_no_extra() {
    let json = br#"{"customCoordinates":[]}"#;
    let meta = extract_tag_meta(json);
    assert!(meta.is_empty());
}

#[test]
fn parsed_tags_sorted_by_order() {
    let json = br#"{"name":"test","customCoordinates":[
        {"lat":1,"lng":2,"extra":{"tags":["Beta","Alpha","Gamma"]}},
        {"lat":3,"lng":4,"extra":{"tags":["Alpha"]}}
    ],"extra":{"tags":{"Alpha":{"color":[255,0,0],"order":2},"Beta":{"color":[0,255,0],"order":0},"Gamma":{"color":[0,0,255],"order":1}}}}"#;
    let mut buf = json.to_vec();
    let parsed = parse_single_json_mut(&mut buf);
    assert_eq!(parsed.tags.len(), 3);
    assert_eq!(parsed.tags[0].name, "Beta");
    assert_eq!(parsed.tags[0].order, Some(0));
    assert_eq!(parsed.tags[1].name, "Gamma");
    assert_eq!(parsed.tags[1].order, Some(1));
    assert_eq!(parsed.tags[2].name, "Alpha");
    assert_eq!(parsed.tags[2].order, Some(2));
}
