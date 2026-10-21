import { Layout } from "antd";
import commit from "../utils/commit.json"

function MyFooter() {
    return (
        <Layout.Footer
            style={{
                backgroundColor: "#001529",
                color: "#fff",
                padding: "10px 0px",
                textAlign: "center",
                width: "100%",
            }}
        >
            <a href="https://lfortran.org/">LFortran</a> (<a href={"https://github.com/lfortran/lfortran/commit/" + commit.id}>{commit.id}</a>) by &nbsp;
            <a href="https://lcompilers.org/">LCompilers</a> | &nbsp;
            <a href="https://github.com/lfortran/lcompilers_frontend">Contribute</a> |&nbsp;
            <a href="https://github.com/lfortran/lcompilers_frontend/issues">Report Issues</a>
        </Layout.Footer>
    );
}

export default MyFooter;
